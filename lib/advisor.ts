// Rule-based Resource Planning advisor (Phase 3) — no LLM, no external API, pure deterministic
// function so it's unit-testable and its output is fully explainable. See docs/RESOURCE-PLANNING.md
// "Phase 3" for the rule this implements.
import { TARGET_RATIO } from "./utils/workload"

const MIN_TRANSFER_HOURS = 4
const MAX_SUGGESTIONS = 5
const OVERLOAD_THRESHOLD = 110 // matches workloadStatus()'s Overload cutoff
const ON_TRACK_CEILING = 100 // a receiver must stay at or under this pct

export interface AdvisorPerson {
  id: string
  name: string
  monthlyCapacityHours: number
  roles: string[]
}

export interface AdvisorEntry {
  releaseId: string
  personId: string
  month: string // "YYYY-MM"
  hours: number
  projectId: string
  projectName: string
  releaseVersion: string
}

export interface AdvisorSuggestion {
  month: string
  releaseId: string
  projectName: string
  releaseVersion: string
  giverId: string
  giverName: string
  giverBeforePct: number
  giverAfterPct: number
  receiverId: string
  receiverName: string
  receiverBeforePct: number
  receiverAfterPct: number
  hours: number
  reason: string
}

export interface GenerateAdvisorSuggestionsParams {
  months: string[]
  people: AdvisorPerson[]
  entries: AdvisorEntry[]
  /** projectId -> set of personIds already on that project's team, for preference tier (a) */
  membershipsByProject: Map<string, Set<string>>
  roleLabels?: Record<string, string>
}

function personTarget(p: AdvisorPerson): number {
  return p.monthlyCapacityHours * TARGET_RATIO
}

function roundPct(hours: number, target: number): number {
  return target > 0 ? Math.round((hours / target) * 1000) / 10 : 0
}

export function generateAdvisorSuggestions(params: GenerateAdvisorSuggestionsParams): AdvisorSuggestion[] {
  const { months, people, entries, membershipsByProject, roleLabels = {} } = params
  const peopleById = new Map(people.map((p) => [p.id, p]))

  function baselinePlanned(personId: string, month: string): number {
    let total = 0
    for (const e of entries) if (e.personId === personId && e.month === month) total += e.hours
    return total
  }

  // Running total per (person, month), seeded from real data and updated as suggestions are
  // decided within this call. Without this, two suggestions in the same batch could each
  // independently offer the same receiver's last few hours of headroom — individually valid
  // against the real snapshot, but together capable of pushing that receiver over 100% if a user
  // applied both. Tracking the running total means the second suggestion sees the first's claim
  // and looks for headroom (or a different receiver) instead of double-booking it.
  const virtualPlanned = new Map<string, number>()
  function plannedKey(personId: string, month: string): string {
    return `${personId}::${month}`
  }
  function plannedFor(personId: string, month: string): number {
    const key = plannedKey(personId, month)
    if (!virtualPlanned.has(key)) virtualPlanned.set(key, baselinePlanned(personId, month))
    return virtualPlanned.get(key)!
  }
  function pctFor(personId: string, month: string): number {
    const person = peopleById.get(personId)
    if (!person) return 0
    return roundPct(plannedFor(personId, month), personTarget(person))
  }
  function applyVirtualTransfer(giverId: string, receiverId: string, month: string, hours: number) {
    virtualPlanned.set(plannedKey(giverId, month), plannedFor(giverId, month) - hours)
    virtualPlanned.set(plannedKey(receiverId, month), plannedFor(receiverId, month) + hours)
  }

  // Sort key is the giver's total excess in hours, not pct — two givers at different capacities
  // can share a pct but not an excess (or vice versa), and the spec sorts by excess specifically.
  const suggestions: (AdvisorSuggestion & { _giverExcess: number })[] = []

  for (const month of months) {
    for (const giver of people) {
      const giverPlannedStart = plannedFor(giver.id, month)
      const giverTarget = personTarget(giver)
      const giverPctStart = roundPct(giverPlannedStart, giverTarget)
      if (giverPctStart <= OVERLOAD_THRESHOLD) continue

      const giverExcess = giverPlannedStart - giverTarget
      let remainingExcess = giverExcess
      if (remainingExcess <= 0) continue

      const giverEntries = entries
        .filter((e) => e.personId === giver.id && e.month === month)
        .sort((a, b) => b.hours - a.hours)

      for (const entry of giverEntries) {
        if (remainingExcess < MIN_TRANSFER_HOURS) break

        const projectMembers = membershipsByProject.get(entry.projectId) ?? new Set<string>()
        const eligible = people.filter((q) => q.id !== giver.id && pctFor(q.id, month) < ON_TRACK_CEILING)
        if (eligible.length === 0) continue

        function tier(q: AdvisorPerson): number {
          if (projectMembers.has(q.id)) return 0
          if (q.roles.some((r) => giver.roles.includes(r))) return 1
          return 2
        }
        eligible.sort((a, b) => {
          const diff = tier(a) - tier(b)
          if (diff !== 0) return diff
          return pctFor(a.id, month) - pctFor(b.id, month)
        })
        const receiver = eligible[0]
        const receiverTarget = personTarget(receiver)
        const giverBeforePct = pctFor(giver.id, month)
        const giverPlannedBefore = plannedFor(giver.id, month)
        const receiverBeforePct = pctFor(receiver.id, month)
        const receiverPlannedBefore = plannedFor(receiver.id, month)
        const receiverGap = receiverTarget - receiverPlannedBefore
        const proposed = Math.floor(Math.min(remainingExcess, entry.hours, receiverGap))
        if (proposed < MIN_TRANSFER_HOURS) continue

        let reason = `${receiver.name} มี pct ต่ำสุดที่ยังรับได้`
        if (projectMembers.has(receiver.id)) {
          reason = "อยู่ในโปรเจกต์นี้อยู่แล้ว"
        } else {
          const overlapRole = receiver.roles.find((r) => giver.roles.includes(r))
          if (overlapRole) reason = `role ตรงกัน: ${roleLabels[overlapRole] ?? overlapRole}`
        }

        suggestions.push({
          month,
          releaseId: entry.releaseId,
          projectName: entry.projectName,
          releaseVersion: entry.releaseVersion,
          giverId: giver.id,
          giverName: giver.name,
          giverBeforePct,
          giverAfterPct: roundPct(giverPlannedBefore - proposed, giverTarget),
          receiverId: receiver.id,
          receiverName: receiver.name,
          receiverBeforePct,
          receiverAfterPct: roundPct(receiverPlannedBefore + proposed, receiverTarget),
          hours: proposed,
          reason,
          _giverExcess: giverExcess,
        })

        applyVirtualTransfer(giver.id, receiver.id, month, proposed)
        remainingExcess -= proposed
      }
    }
  }

  suggestions.sort((a, b) => b._giverExcess - a._giverExcess || b.hours - a.hours)
  return suggestions.slice(0, MAX_SUGGESTIONS).map(({ _giverExcess, ...s }) => s)
}
