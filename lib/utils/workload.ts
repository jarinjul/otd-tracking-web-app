import type { ProjectWithRelations, Person } from "@/lib/types"

export const TARGET_RATIO = 0.8 // Target Capacity = 80% of monthly capacity

// "YYYY-MM" using local date components (avoids the UTC-shift bug of toISOString for GMT+ zones).
export function monthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function workloadStatus(pct: number): { label: string; bg: string; color: string } {
  if (pct < 60) return { label: "Underutilized", bg: "var(--color-accent-light)", color: "var(--color-accent)" }
  if (pct <= 100) return { label: "On Track", bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)" }
  if (pct <= 110) return { label: "Warning", bg: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)" }
  return { label: "Overload", bg: "var(--color-rag-red-light)", color: "var(--color-rag-red-text)" }
}

export interface PersonFocusRelease {
  releaseId: string
  version: string
  projectId: string
  projectName: string
  hours: number
}

export interface PersonFocusNextStep {
  id: string
  description: string
  dueDate: Date | string
  priority: string
  overdue: boolean
  projectName: string
}

export interface PersonFocus {
  totalHours: number
  target: number
  pct: number
  status: ReturnType<typeof workloadStatus>
  releases: PersonFocusRelease[]
  nextSteps: PersonFocusNextStep[]
}

// What a person is actively assigned to right now: this month's release hours (from the
// Workload page's monthly entries) plus their open Next Steps, matched by owner name.
export function computePersonFocus(person: Pick<Person, "id" | "name" | "monthlyCapacityHours">, projects: ProjectWithRelations[], month: string): PersonFocus {
  const capacity = person.monthlyCapacityHours ?? 160
  const target = capacity * TARGET_RATIO

  const releaseMap = new Map<string, PersonFocusRelease>()
  let totalHours = 0
  for (const project of projects) {
    for (const release of project.releases ?? []) {
      for (const entry of (release as any).workloadEntries ?? []) {
        if (entry.personId !== person.id) continue
        if (monthKey(entry.month) !== month) continue
        totalHours += entry.hours
        if (!releaseMap.has(release.id)) {
          releaseMap.set(release.id, { releaseId: release.id, version: release.version, projectId: project.id, projectName: project.name, hours: 0 })
        }
        releaseMap.get(release.id)!.hours += entry.hours
      }
    }
  }
  const releases = Array.from(releaseMap.values()).sort((a, b) => b.hours - a.hours)

  const today = new Date()
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const nextSteps: PersonFocusNextStep[] = []
  for (const project of projects) {
    for (const release of project.releases ?? []) {
      for (const step of (release as any).nextSteps ?? []) {
        if (step.done) continue
        if (step.owner.trim().toLowerCase() !== person.name.trim().toLowerCase()) continue
        nextSteps.push({
          id: step.id,
          description: step.description,
          dueDate: step.dueDate,
          priority: step.priority ?? "medium",
          overdue: new Date(step.dueDate) < today,
          projectName: project.name,
        })
      }
    }
  }
  nextSteps.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    const pd = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
    if (pd !== 0) return pd
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  const pct = target > 0 ? Math.round((totalHours / target) * 1000) / 10 : 0
  return {
    totalHours: Math.round(totalHours),
    target: Math.round(target),
    pct,
    status: workloadStatus(pct),
    releases,
    nextSteps: nextSteps.slice(0, 2),
  }
}
