"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, AlertTriangle, TrendingDown, Flag, Plus, Sparkles } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { SlidePanel } from "@/components/ui/SlidePanel"
import { AssignDialog } from "./AssignDialog"
import { TARGET_RATIO, monthKey, workloadStatus } from "@/lib/utils/workload"
import { buildWeekBuckets, distributeMonthlyHoursToWeeks, weekLabel, type WeekBucket } from "@/lib/utils/weekEstimate"
import { generateAdvisorSuggestions, type AdvisorSuggestion } from "@/lib/advisor"
import { ROLE_LABELS } from "@/lib/types"
import type { ProjectRole } from "@/lib/types"

type PersonOpt = { id: string; name: string; avatarUrl: string | null; monthlyCapacityHours: number; roles: ProjectRole[] }
type WorkloadEntryOpt = { personId: string; month: Date | string; hours: number }
type ReleaseOpt = {
  id: string
  version: string
  status: string
  startDate: Date | string | null
  endDate: Date | string | null
  workloadEntries: WorkloadEntryOpt[]
}
type ProjectOpt = { id: string; name: string; releases: ReleaseOpt[] }
type InterruptOpt = { personId: string; date: Date | string; hours: number }
type MembershipOpt = { personId: string; projectId: string }

interface ResourcePlanningClientProps {
  people: PersonOpt[]
  projects: ProjectOpt[]
  interrupts: InterruptOpt[]
  memberships: MembershipOpt[]
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
// Must match FETCH_MONTHS_AHEAD in page.tsx — how far ahead the server actually fetched data for.
const FETCH_MONTHS_AHEAD = 12
const MAX_START_OFFSET = 6
const WEEKS_PER_MONTH = 4.33

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

function addMonthsKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number)
  return monthKey(new Date(y, m - 1 + delta, 1))
}

const inputStyle = { borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-text-primary)" }

function KpiCard({ label, value, valueColor, subtitle }: { label: string; value: React.ReactNode; valueColor?: string; subtitle?: React.ReactNode }) {
  return (
    <div className="rounded-card border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-xl font-bold mt-0.5" style={valueColor ? { color: valueColor } : { color: "var(--color-text-primary)" }}>{value}</p>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{subtitle}</p>}
    </div>
  )
}

export function ResourcePlanningClient({ people, projects, interrupts, memberships }: ResourcePlanningClientProps) {
  const currentMonthKey = useMemo(() => monthKey(new Date()), [])
  const [rangeMonths, setRangeMonths] = useState<3 | 6>(3)
  const [startOffset, setStartOffset] = useState(0)
  const [viewMode, setViewMode] = useState<"month" | "week">("month")
  const [panel, setPanel] = useState<{ personId: string; month: string } | null>(null)

  const maxStartOffset = Math.min(MAX_START_OFFSET, FETCH_MONTHS_AHEAD - rangeMonths)
  const effectiveStartOffset = Math.min(startOffset, maxStartOffset)

  const viewMonths = useMemo(
    () => Array.from({ length: rangeMonths }, (_, i) => addMonthsKey(currentMonthKey, effectiveStartOffset + i)),
    [currentMonthKey, effectiveStartOffset, rangeMonths]
  )

  // ── Editable allocation state (Phase 2) ──
  // Release/project metadata never changes from this page, so it's indexed once from the server
  // props. Hours are mutable local state (`entryHours`) so cell edits and Assigns can update the
  // grid, KPIs, and outlook instantly without a full page refetch — the source of truth is still
  // POST /api/workload; this is just an optimistic local mirror of it.
  function cellKey(releaseId: string, personId: string, month: string): string {
    return `${releaseId}::${personId}::${month}`
  }

  const releaseIndex = useMemo(() => {
    const map = new Map<string, { version: string; startDate: Date | null; endDate: Date | null; projectId: string; projectName: string }>()
    for (const project of projects) {
      for (const release of project.releases) {
        map.set(release.id, {
          version: release.version,
          startDate: release.startDate ? toDate(release.startDate) : null,
          endDate: release.endDate ? toDate(release.endDate) : null,
          projectId: project.id,
          projectName: project.name,
        })
      }
    }
    return map
  }, [projects])

  const [entryHours, setEntryHours] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const project of projects) {
      for (const release of project.releases) {
        for (const e of release.workloadEntries) {
          map[cellKey(release.id, e.personId, monthKey(e.month))] = e.hours
        }
      }
    }
    return map
  })

  const [saveError, setSaveError] = useState<string | null>(null)
  function flashSaveError(message: string) {
    setSaveError(message)
    setTimeout(() => setSaveError(null), 4000)
  }

  async function postWorkloadEntry(releaseId: string, personId: string, month: string, hours: number): Promise<boolean> {
    try {
      const res = await fetch("/api/workload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId, personId, month, hours }),
      })
      return res.ok || res.status === 204
    } catch {
      return false
    }
  }

  // The allocation list in the side panel is filtered to hours > 0 (so a saved-to-0 row disappears,
  // per spec). If typing were wired straight into entryHours, clearing the field to retype a new
  // value would hit an empty string mid-edit and instantly delete the row out from under the input.
  // Draft text is kept separate and only committed (and only then POSTed) on blur.
  const [draftInputs, setDraftInputs] = useState<Record<string, string>>({})
  function inputValueFor(key: string): string {
    if (key in draftInputs) return draftInputs[key]
    const h = entryHours[key]
    return h ? String(Math.round(h)) : ""
  }
  function handleDraftChange(key: string, raw: string) {
    setDraftInputs((prev) => ({ ...prev, [key]: raw }))
  }
  async function commitEntry(releaseId: string, personId: string, month: string) {
    const key = cellKey(releaseId, personId, month)
    const raw = draftInputs[key]
    setDraftInputs((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    if (raw === undefined) return
    const value = raw === "" ? 0 : Number(raw)
    if (Number.isNaN(value)) return
    const baseline = entryHours[key] ?? 0
    if (value === baseline) return
    setEntryHours((prev) => {
      const next = { ...prev }
      if (value <= 0) delete next[key]
      else next[key] = value
      return next
    })
    const ok = await postWorkloadEntry(releaseId, personId, month, value)
    if (!ok) {
      setEntryHours((prev) => {
        const next = { ...prev }
        if (baseline <= 0) delete next[key]
        else next[key] = baseline
        return next
      })
      flashSaveError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง")
    }
  }
  // Used by the Assign dialog — a brand-new entry, no draft/baseline involved.
  async function handleAssignSubmit({ releaseId, personId, month, hours }: { releaseId: string; personId: string; month: string; hours: number }): Promise<boolean> {
    const ok = await postWorkloadEntry(releaseId, personId, month, hours)
    if (ok) setEntryHours((prev) => ({ ...prev, [cellKey(releaseId, personId, month)]: hours }))
    return ok
  }

  // ── Derived from entryHours (not the static props) so edits propagate everywhere automatically ──
  const flatEntries = useMemo(() => {
    const list: { personId: string; month: string; hours: number; releaseId: string; startDate: Date | null; endDate: Date | null }[] = []
    for (const [key, hours] of Object.entries(entryHours)) {
      if (hours <= 0) continue
      const [releaseId, personId, month] = key.split("::")
      const release = releaseIndex.get(releaseId)
      list.push({ personId, month, hours, releaseId, startDate: release?.startDate ?? null, endDate: release?.endDate ?? null })
    }
    return list
  }, [entryHours, releaseIndex])

  const releaseTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const [key, hours] of Object.entries(entryHours)) {
      if (hours <= 0) continue
      const releaseId = key.split("::")[0]
      map.set(releaseId, (map.get(releaseId) ?? 0) + hours)
    }
    return map
  }, [entryHours])

  function personReleaseBreakdown(personId: string, month: string) {
    return flatEntries
      .filter((e) => e.personId === personId && e.month === month)
      .map((e) => {
        const release = releaseIndex.get(e.releaseId)
        return { releaseId: e.releaseId, version: release?.version ?? "?", projectName: release?.projectName ?? "?", hours: e.hours }
      })
      .sort((a, b) => b.hours - a.hours)
  }

  // personId -> month -> release hours only. This is deliberately release-only (no interrupts) so
  // it matches /workload's per-person % exactly — that page predates InterruptTask and was never
  // updated to fold interrupts into utilization. Interrupts are surfaced as a separate figure
  // instead (team KPI "Planned" card, side panel "Interrupts" line) rather than merged in here.
  const releaseHoursByPersonMonth = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const e of flatEntries) {
      if (!map.has(e.personId)) map.set(e.personId, new Map())
      const m = map.get(e.personId)!
      m.set(e.month, (m.get(e.month) ?? 0) + e.hours)
    }
    return map
  }, [flatEntries])

  const interruptHoursByPersonMonth = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const it of interrupts) {
      const mk = monthKey(it.date)
      if (!map.has(it.personId)) map.set(it.personId, new Map())
      const m = map.get(it.personId)!
      m.set(mk, (m.get(mk) ?? 0) + it.hours)
    }
    return map
  }, [interrupts])

  function releaseHours(personId: string, month: string): number {
    return releaseHoursByPersonMonth.get(personId)?.get(month) ?? 0
  }
  function interruptHours(personId: string, month: string): number {
    return interruptHoursByPersonMonth.get(personId)?.get(month) ?? 0
  }
  function personTarget(person: PersonOpt): number {
    return person.monthlyCapacityHours * TARGET_RATIO
  }
  function personPct(person: PersonOpt, month: string): number {
    const target = personTarget(person)
    const total = releaseHours(person.id, month)
    return target > 0 ? Math.round((total / target) * 1000) / 10 : 0
  }

  // ── Week view: distribute each monthly entry across weeks, client-side, read-only estimate ──
  const weekBuckets: WeekBucket[] = useMemo(() => {
    if (viewMode !== "week" || viewMonths.length === 0) return []
    const [fy, fm] = viewMonths[0].split("-").map(Number)
    const [ly, lm] = viewMonths[viewMonths.length - 1].split("-").map(Number)
    const rangeStart = new Date(fy, fm - 1, 1)
    const rangeEnd = new Date(ly, lm, 0)
    return buildWeekBuckets(rangeStart, rangeEnd)
  }, [viewMode, viewMonths])

  const personWeekTotals = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    if (viewMode !== "week" || weekBuckets.length === 0) return map
    const monthsSet = new Set(viewMonths)
    for (const e of flatEntries) {
      if (!monthsSet.has(e.month)) continue
      const dist = distributeMonthlyHoursToWeeks(e.hours, e.month, e.startDate, e.endDate, weekBuckets)
      if (!map.has(e.personId)) map.set(e.personId, new Map())
      const pm = map.get(e.personId)!
      for (const [wk, h] of Object.entries(dist)) pm.set(wk, (pm.get(wk) ?? 0) + h)
    }
    // Interrupts are real daily data, not estimated — add them straight into whichever week they fall in.
    for (const it of interrupts) {
      const d = toDate(it.date)
      const bucket = weekBuckets.find((w) => d >= w.start && d <= w.end)
      if (!bucket) continue
      if (!map.has(it.personId)) map.set(it.personId, new Map())
      const pm = map.get(it.personId)!
      pm.set(bucket.key, (pm.get(bucket.key) ?? 0) + it.hours)
    }
    return map
  }, [viewMode, weekBuckets, flatEntries, viewMonths, interrupts])

  function weekTotal(personId: string, weekKey: string): number {
    return personWeekTotals.get(personId)?.get(weekKey) ?? 0
  }
  function weeklyCapacity(person: PersonOpt): number {
    return person.monthlyCapacityHours / WEEKS_PER_MONTH
  }
  function weekPct(person: PersonOpt, weekKey: string): number {
    const target = weeklyCapacity(person) * TARGET_RATIO
    const total = weekTotal(person.id, weekKey)
    return target > 0 ? Math.round((total / target) * 1000) / 10 : 0
  }

  // ── KPI row — always the real current month, independent of the grid's start-month picker ──
  const totalCapacity = useMemo(() => people.reduce((s, p) => s + p.monthlyCapacityHours, 0), [people])
  const totalTarget = totalCapacity * TARGET_RATIO
  const kpiPlanned = useMemo(
    () => people.reduce((s, p) => s + releaseHours(p.id, currentMonthKey) + interruptHours(p.id, currentMonthKey), 0),
    [people, releaseHoursByPersonMonth, interruptHoursByPersonMonth, currentMonthKey]
  )
  const kpiAvailableHours = useMemo(
    () => people.reduce((s, p) => s + Math.max(0, personTarget(p) - releaseHours(p.id, currentMonthKey) - interruptHours(p.id, currentMonthKey)), 0),
    [people, releaseHoursByPersonMonth, interruptHoursByPersonMonth, currentMonthKey]
  )
  const kpiAvailablePct = totalTarget > 0 ? Math.round((kpiAvailableHours / totalTarget) * 1000) / 10 : 0
  const kpiOverloaded = useMemo(() => people.filter((p) => personPct(p, currentMonthKey) > 110).length, [people, releaseHoursByPersonMonth, currentMonthKey])
  const kpiUnderutilized = useMemo(() => people.filter((p) => personPct(p, currentMonthKey) < 60).length, [people, releaseHoursByPersonMonth, currentMonthKey])

  // ── Capacity Outlook ──
  const riskPoints = useMemo(() => {
    const rows: { month: string; person: PersonOpt; pct: number; hours: number; target: number; capacity: number }[] = []
    for (const m of viewMonths) {
      for (const p of people) {
        const pct = personPct(p, m)
        if (pct > 100) rows.push({ month: m, person: p, pct, hours: Math.round(releaseHours(p.id, m)), target: Math.round(personTarget(p)), capacity: p.monthlyCapacityHours })
      }
    }
    rows.sort((a, b) => (a.month === b.month ? b.pct - a.pct : a.month < b.month ? -1 : 1))
    return rows
  }, [viewMonths, people, releaseHoursByPersonMonth])

  const gapMonths = useMemo(() => {
    const rows: { month: string; teamPct: number }[] = []
    for (const m of viewMonths) {
      const teamTotal = people.reduce((s, p) => s + releaseHours(p.id, m), 0)
      const teamPct = totalTarget > 0 ? Math.round((teamTotal / totalTarget) * 1000) / 10 : 0
      if (teamPct < 60) rows.push({ month: m, teamPct })
    }
    return rows
  }, [viewMonths, people, releaseHoursByPersonMonth, totalTarget])

  const viewStartDate = useMemo(() => { const [y, m] = viewMonths[0].split("-").map(Number); return new Date(y, m - 1, 1) }, [viewMonths])
  const viewEndDate = useMemo(() => { const [y, m] = viewMonths[viewMonths.length - 1].split("-").map(Number); return new Date(y, m, 0) }, [viewMonths])

  const unassignedReleases = useMemo(() => {
    const rows: { releaseId: string; projectId: string; version: string; projectName: string; startDate: Date }[] = []
    for (const project of projects) {
      for (const release of project.releases) {
        if (!release.startDate) continue
        const start = toDate(release.startDate)
        if (start < viewStartDate || start > viewEndDate) continue
        if ((releaseTotals.get(release.id) ?? 0) === 0) rows.push({ releaseId: release.id, projectId: project.id, version: release.version, projectName: project.name, startDate: start })
      }
    }
    rows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    return rows
  }, [projects, viewStartDate, viewEndDate, releaseTotals])

  // ── Advisor (Phase 3) — pure rule-based suggestions, recomputed from entryHours on every render
  // so it self-refreshes after every Apply, exactly like the KPI row and Capacity Outlook already do ──
  const membershipsByProject = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const m of memberships) {
      if (!map.has(m.projectId)) map.set(m.projectId, new Set())
      map.get(m.projectId)!.add(m.personId)
    }
    return map
  }, [memberships])

  const advisorEntries = useMemo(
    () =>
      flatEntries.map((e) => {
        const release = releaseIndex.get(e.releaseId)
        return {
          releaseId: e.releaseId,
          personId: e.personId,
          month: e.month,
          hours: e.hours,
          projectId: release?.projectId ?? "",
          projectName: release?.projectName ?? "?",
          releaseVersion: release?.version ?? "?",
        }
      }),
    [flatEntries, releaseIndex]
  )

  const suggestions = useMemo(
    () =>
      generateAdvisorSuggestions({
        months: viewMonths,
        people,
        entries: advisorEntries,
        membershipsByProject,
        roleLabels: ROLE_LABELS,
      }),
    [viewMonths, people, advisorEntries, membershipsByProject]
  )

  const [confirmingSuggestion, setConfirmingSuggestion] = useState<string | null>(null)
  const [applyingSuggestion, setApplyingSuggestion] = useState<string | null>(null)

  function suggestionKey(s: AdvisorSuggestion): string {
    return `${s.month}::${s.releaseId}::${s.giverId}::${s.receiverId}::${s.hours}`
  }

  async function handleApplySuggestion(s: AdvisorSuggestion) {
    const key = suggestionKey(s)
    setApplyingSuggestion(key)
    const giverKey = cellKey(s.releaseId, s.giverId, s.month)
    const receiverKey = cellKey(s.releaseId, s.receiverId, s.month)
    const newGiverHours = (entryHours[giverKey] ?? 0) - s.hours
    const newReceiverHours = (entryHours[receiverKey] ?? 0) + s.hours

    const ok1 = await postWorkloadEntry(s.releaseId, s.giverId, s.month, newGiverHours)
    if (ok1) {
      setEntryHours((prev) => {
        const next = { ...prev }
        if (newGiverHours <= 0) delete next[giverKey]
        else next[giverKey] = newGiverHours
        return next
      })
    }
    const ok2 = ok1 && (await postWorkloadEntry(s.releaseId, s.receiverId, s.month, newReceiverHours))
    if (ok2) {
      setEntryHours((prev) => ({ ...prev, [receiverKey]: newReceiverHours }))
    }
    if (!ok1) flashSaveError("Apply ไม่สำเร็จ ลองใหม่อีกครั้ง")
    else if (!ok2) flashSaveError("ลดชั่วโมงฝั่งที่ล้นแล้ว แต่เพิ่มให้อีกฝั่งไม่สำเร็จ ลองใหม่อีกครั้ง")
    setApplyingSuggestion(null)
    setConfirmingSuggestion(null)
  }

  // ── Side panel ──
  const panelPerson = panel ? people.find((p) => p.id === panel.personId) ?? null : null
  const panelMinMonth = currentMonthKey
  const panelMaxMonth = addMonthsKey(currentMonthKey, FETCH_MONTHS_AHEAD - 1)
  const assignableMonths = useMemo(() => Array.from({ length: FETCH_MONTHS_AHEAD }, (_, i) => addMonthsKey(currentMonthKey, i)), [currentMonthKey])

  // ── Assign dialog (Phase 2) ──
  const [assignDialog, setAssignDialog] = useState<{
    defaultPersonId?: string
    lockPerson?: boolean
    defaultReleaseId?: string
    lockRelease?: boolean
    defaultMonth: string
  } | null>(null)

  function openAssignFromPanel() {
    if (!panel) return
    setAssignDialog({ defaultPersonId: panel.personId, lockPerson: true, defaultMonth: panel.month })
  }
  function openAssignFromRelease(releaseId: string, startDate: Date) {
    const month = monthKey(startDate) >= panelMinMonth ? monthKey(startDate) : panelMinMonth
    setAssignDialog({ defaultReleaseId: releaseId, lockRelease: true, defaultMonth: month })
  }

  function openPanel(personId: string, month: string) {
    setPanel({ personId, month })
  }
  function shiftPanelMonth(delta: number) {
    setPanel((prev) => {
      if (!prev) return prev
      const next = addMonthsKey(prev.month, delta)
      if (next < panelMinMonth || next > panelMaxMonth) return prev
      return { ...prev, month: next }
    })
  }
  function defaultMonthForRow(): string {
    return viewMonths.includes(currentMonthKey) ? currentMonthKey : viewMonths[0]
  }

  const columns = viewMode === "month"
    ? viewMonths.map((m) => ({ key: m, label: monthLabel(m), refMonth: m }))
    : weekBuckets.map((w) => ({ key: w.key, label: weekLabel(w), refMonth: monthKey(w.start) }))

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Resource Planning</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            ตอนนี้ใครทำอะไร ใครล้น ใครว่าง — และอีก {rangeMonths} เดือนข้างหน้าจะเป็นอย่างไร
          </p>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col items-end gap-0.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>เดือนเริ่ม</label>
            <select
              value={effectiveStartOffset}
              onChange={(e) => setStartOffset(Number(e.target.value))}
              className="px-3 py-1.5 text-sm rounded-lg border"
              style={inputStyle}
            >
              {Array.from({ length: maxStartOffset + 1 }, (_, i) => i).map((i) => (
                <option key={i} value={i}>{monthLabel(addMonthsKey(currentMonthKey, i))}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>ช่วงมอง</label>
            <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
              {([3, 6] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRangeMonths(n)}
                  className="px-3 py-1.5 text-sm font-medium"
                  style={rangeMonths === n ? { background: "var(--color-accent)", color: "white" } : { background: "var(--color-card)", color: "var(--color-text-muted)" }}
                >
                  {n} เดือน
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-8">
        {/* KPI row — current month */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <KpiCard label={`Total Capacity (${monthLabel(currentMonthKey)})`} value={`${Math.round(totalCapacity)}h`} />
          <KpiCard label="Planned" value={`${Math.round(kpiPlanned)}h`} subtitle="release + interrupt hours" />
          <KpiCard
            label="Available (vs Target)"
            value={`${Math.round(kpiAvailableHours)}h`}
            valueColor={kpiAvailableHours <= 0 ? "var(--color-rag-red-text)" : undefined}
            subtitle={`${kpiAvailablePct}% · เทียบ target 80%`}
          />
          <KpiCard label="Overloaded" value={`${kpiOverloaded} คน`} valueColor={kpiOverloaded > 0 ? "var(--color-rag-red-text)" : undefined} />
          <KpiCard label="Underutilized" value={`${kpiUnderutilized} คน`} valueColor={kpiUnderutilized > 0 ? "var(--color-accent)" : undefined} />
        </div>

        {/* Resource Grid */}
        <div className="rounded-xl border mb-2" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Resource Grid</p>
            <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
              {(["month", "week"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className="px-3 py-1 text-xs font-medium capitalize"
                  style={viewMode === mode ? { background: "var(--color-accent)", color: "white" } : { background: "var(--color-card)", color: "var(--color-text-muted)" }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {viewMode === "week" && (
            <p className="text-xs px-4 pt-2.5" style={{ color: "var(--color-text-muted)" }}>
              มุมมองสัปดาห์เป็นประมาณการจากข้อมูลรายเดือน — ตัวเลขนำหน้าด้วย ~ และแก้ไขจากมุมมองนี้ไม่ได้
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="text-sm border-collapse w-full">
              <thead>
                <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap sticky left-0" style={{ color: "var(--color-text-muted)", background: "var(--color-surface)", minWidth: 220 }}>
                    Person
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} className="px-2 py-2.5 text-center text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-text-muted)", minWidth: viewMode === "month" ? 92 : 100 }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td
                      className="px-4 py-2 whitespace-nowrap sticky left-0 cursor-pointer"
                      style={{ background: "var(--color-card)" }}
                      onClick={() => openPanel(person.id, defaultMonthForRow())}
                    >
                      <span className="flex items-center gap-2">
                        <Avatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                        <span className="min-w-0">
                          <span className="block text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{person.name}</span>
                          <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>{person.monthlyCapacityHours}h/mo</span>
                        </span>
                      </span>
                    </td>
                    {columns.map((col) => {
                      const total = viewMode === "month" ? releaseHours(person.id, col.key) : weekTotal(person.id, col.key)
                      const pct = viewMode === "month" ? personPct(person, col.key) : weekPct(person, col.key)
                      const status = workloadStatus(pct)
                      const hasData = total > 0
                      return (
                        <td key={col.key} className="px-1.5 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => openPanel(person.id, col.refMonth)}
                            className="w-full px-1.5 py-1.5 rounded-lg text-xs font-medium"
                            style={hasData ? { background: status.bg, color: status.color } : { background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                          >
                            {hasData ? (
                              <>
                                <span className="block font-semibold">{viewMode === "week" ? `~${Math.round(total)}h` : `${Math.round(total)}h`}</span>
                                <span className="block">{pct}%</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-6 text-xs flex-wrap" style={{ color: "var(--color-text-muted)" }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-accent)" }} /> &lt;60% Underutilized</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-rag-green)" }} /> ≤100% On Track</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-rag-amber)" }} /> 100–110% Warning</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-rag-red)" }} /> &gt;110% Overload</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} /> No data</span>
        </div>

        {/* Capacity Outlook */}
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Capacity Outlook</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--color-rag-red-text)" }}>
                <AlertTriangle size={13} /> จุดเสี่ยง ({riskPoints.length})
              </p>
              {riskPoints.length === 0 ? (
                <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ไม่มีใคร overload ในช่วงที่ดู</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {riskPoints.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openPanel(r.person.id, r.month)}
                      className="text-left text-xs px-2.5 py-1.5 rounded-lg"
                      style={{ background: "var(--color-rag-red-light)", color: "var(--color-rag-red-text)" }}
                    >
                      {monthLabel(r.month)} — {r.person.name} {r.pct}% ({r.hours}/{r.capacity}h)
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}>
                <TrendingDown size={13} /> ช่องว่าง ({gapMonths.length})
              </p>
              {gapMonths.length === 0 ? (
                <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ไม่มีเดือนที่ทีมโหลดต่ำผิดปกติ</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {gapMonths.map((g) => (
                    <div key={g.month} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                      {monthLabel(g.month)} — ทีมรวม {g.teamPct}% ของ target
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--color-rag-amber-text)" }}>
              <Flag size={13} /> ยังไม่ได้วางคน ({unassignedReleases.length})
            </p>
            {unassignedReleases.length === 0 ? (
              <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ทุก release ในช่วงที่ดูมีคนวางแล้ว</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unassignedReleases.map((r) => (
                  <span key={r.releaseId} className="inline-flex items-center gap-1.5 text-xs pl-2.5 pr-1.5 py-1.5 rounded-lg" style={{ background: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)" }}>
                    {r.projectName} · {r.version} — เริ่ม {monthLabel(monthKey(r.startDate))}
                    <button
                      type="button"
                      onClick={() => openAssignFromRelease(r.releaseId, r.startDate)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(0,0,0,0.08)" }}
                    >
                      <Plus size={11} /> Assign
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Advisor — rule-based only, no LLM/external API (see lib/advisor.ts) */}
        <div className="rounded-xl border p-5 mt-6" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
          <p className="text-sm font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
            <Sparkles size={14} /> คำแนะนำ (rule-based)
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>ตรวจ overload อัตโนมัติแล้วเสนอย้ายชั่วโมงที่ทำได้จริง — ไม่ใช้ AI ไม่มี external call</p>

          {suggestions.length === 0 ? (
            <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ไม่พบ overload ในช่วงที่ดู</p>
          ) : (
            <div className="flex flex-col gap-3">
              {suggestions.map((s) => {
                const key = suggestionKey(s)
                const isConfirming = confirmingSuggestion === key
                const isApplying = applyingSuggestion === key
                return (
                  <div key={key} className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)" }}>
                    <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                      <strong>{monthLabel(s.month)}</strong> — ย้าย <strong>{s.hours}h</strong> ของ {s.projectName} · {s.releaseVersion} จาก <strong>{s.giverName}</strong> ไป <strong>{s.receiverName}</strong>
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{s.reason}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                      <span style={{ color: "var(--color-text-muted)" }}>{s.giverName}: <strong style={{ color: "var(--color-rag-red-text)" }}>{s.giverBeforePct}%</strong> → <strong style={{ color: "var(--color-text-primary)" }}>{s.giverAfterPct}%</strong></span>
                      <span style={{ color: "var(--color-text-muted)" }}>{s.receiverName}: <strong>{s.receiverBeforePct}%</strong> → <strong style={{ color: "var(--color-text-primary)" }}>{s.receiverAfterPct}%</strong></span>
                    </div>
                    <div className="mt-2.5">
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>ยืนยันย้าย {s.hours}h?</span>
                          <button
                            type="button"
                            onClick={() => handleApplySuggestion(s)}
                            disabled={isApplying}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                            style={{ background: "var(--color-accent)" }}
                          >
                            {isApplying ? "กำลังย้าย..." : "ยืนยัน"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingSuggestion(null)}
                            disabled={isApplying}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingSuggestion(key)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg"
                          style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <SlidePanel open={!!panel} onClose={() => setPanel(null)} width="w-[420px]">
        {panelPerson && panel && (() => {
          const releases = personReleaseBreakdown(panelPerson.id, panel.month)
          const totalHours = releaseHours(panelPerson.id, panel.month)
          const pct = personPct(panelPerson, panel.month)
          const status = workloadStatus(pct)
          const target = personTarget(panelPerson)
          const interruptH = interruptHours(panelPerson.id, panel.month)
          const combinedPlanned = totalHours + interruptH
          const available = target - combinedPlanned
          return (
            <>
              <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-center gap-3">
                  <Avatar name={panelPerson.name} avatarUrl={panelPerson.avatarUrl} size="lg" />
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{panelPerson.name}</h2>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {panelPerson.roles.map((r) => (
                        <span key={r} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button type="button" onClick={() => shiftPanelMonth(-1)} disabled={panel.month <= panelMinMonth} className="p-1 rounded disabled:opacity-30" style={{ color: "var(--color-text-muted)" }}>
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold w-28 text-center" style={{ color: "var(--color-text-primary)" }}>{monthLabel(panel.month)}</span>
                  <button type="button" onClick={() => shiftPanelMonth(1)} disabled={panel.month >= panelMaxMonth} className="p-1 rounded disabled:opacity-30" style={{ color: "var(--color-text-muted)" }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {saveError && (
                  <div className="px-6 py-2 text-xs font-medium" style={{ background: "var(--color-rag-red-light)", color: "var(--color-rag-red-text)" }}>
                    {saveError}
                  </div>
                )}

                <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>Utilization</p>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-3xl font-bold" style={{ color: status.color }}>{pct}%</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: status.color }} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>{Math.round(totalHours)}h / {Math.round(target)}h target</p>
                </div>

                <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Current Allocation</p>
                    <button
                      type="button"
                      onClick={openAssignFromPanel}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                      style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
                    >
                      <Plus size={12} /> Assign
                    </button>
                  </div>
                  {releases.length === 0 ? (
                    <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ไม่มี release ที่วางไว้เดือนนี้</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {releases.map((r) => (
                        <div key={r.releaseId} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate" style={{ color: "var(--color-text-muted)" }} title={`${r.projectName} · ${r.version}`}>{r.projectName} · {r.version}</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={inputValueFor(cellKey(r.releaseId, panelPerson.id, panel.month))}
                            onChange={(e) => handleDraftChange(cellKey(r.releaseId, panelPerson.id, panel.month), e.target.value)}
                            onBlur={() => commitEntry(r.releaseId, panelPerson.id, panel.month)}
                            className="w-16 px-1.5 py-1 text-center text-xs rounded border shrink-0"
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs mt-2 italic" style={{ color: "var(--color-text-muted)" }}>ใส่ 0 เพื่อลบรายการ — บันทึกอัตโนมัติเมื่อออกจากช่อง</p>
                </div>

                {interruptH > 0 && (
                  <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>งานแทรกเดือนนี้</p>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{Math.round(interruptH)}h</p>
                  </div>
                )}

                <div className="px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>Available</p>
                  <p className="text-lg font-bold" style={{ color: available < 0 ? "var(--color-rag-red-text)" : "var(--color-text-primary)" }}>
                    {available < 0 ? `เกิน target ${Math.round(Math.abs(available))}h` : `${Math.round(available)}h`}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>target {Math.round(target)}h − planned {Math.round(combinedPlanned)}h (รวมงานแทรก)</p>
                </div>
              </div>
            </>
          )
        })()}
      </SlidePanel>

      <AssignDialog
        open={!!assignDialog}
        onClose={() => setAssignDialog(null)}
        people={people}
        projects={projects}
        monthOptions={assignableMonths}
        monthLabel={monthLabel}
        defaultPersonId={assignDialog?.defaultPersonId}
        lockPerson={assignDialog?.lockPerson}
        defaultReleaseId={assignDialog?.defaultReleaseId}
        lockRelease={assignDialog?.lockRelease}
        defaultMonth={assignDialog?.defaultMonth ?? currentMonthKey}
        onSubmit={handleAssignSubmit}
      />
    </div>
  )
}
