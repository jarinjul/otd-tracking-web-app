import { prisma } from "@/lib/prisma"
import { worstRagStatus } from "@/lib/utils/rag"
import { pickActiveRelease } from "@/lib/utils/release"
import { costSavingsTotals } from "@/lib/utils/cost"
import { TARGET_RATIO, monthKey } from "@/lib/utils/workload"
import type { ProjectWithRelations, RagStatus } from "@/lib/types"

export interface SnapshotProject {
  id: string
  name: string
  bucket: string | null
  worstRag: RagStatus
  phase: string | null
  progressPercent: number | null
}
export interface SnapshotRelease {
  projectName: string
  version: string
  releaseDate: string
}
export interface SnapshotDecision {
  projectName: string
  version: string
  note: string | null
}
export interface SnapshotRisk {
  projectName: string
  version: string
  description: string
  severity: string // worse of likelihood/impact
}
export interface SnapshotData {
  projects: SnapshotProject[]
  releasesDeployedThisMonth: SnapshotRelease[]
  costSavings: { internalTotal: number; vendorTotal: number; saveTotal: number }
  workload: { avgUtilizationPct: number; overloadedCount: number }
  interrupts: { totalHours: number; pctOfCapacity: number; topSource: string | null }
  pendingDecisions: SnapshotDecision[]
  topRisks: SnapshotRisk[]
}

const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }
function worseSeverity(a: string, b: string): string {
  return SEVERITY_RANK[a] <= SEVERITY_RANK[b] ? a : b
}

/** UTC midnight on the 1st of the month containing `d`. */
export function monthStartUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

export async function computeSnapshot(monthStart: Date): Promise<SnapshotData> {
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1))
  const key = monthKey(monthStart)

  const [projects, releases, people, workloadEntries, interrupts] = await Promise.all([
    prisma.project.findMany({
      include: { releases: true },
      orderBy: { name: "asc" },
    }),
    prisma.release.findMany({
      include: { project: { select: { name: true } } },
    }),
    prisma.person.findMany({ select: { id: true, monthlyCapacityHours: true } }),
    prisma.releaseWorkload.findMany({ select: { personId: true, month: true, hours: true } }),
    prisma.interruptTask.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      select: { hours: true, source: true },
    }),
  ])

  // ── Projects: worst RAG + active release snapshot ──
  const snapshotProjects: SnapshotProject[] = projects.map((p) => {
    const active = pickActiveRelease(p.releases)
    return {
      id: p.id,
      name: p.name,
      bucket: p.strategicBucket,
      worstRag: worstRagStatus(p as unknown as ProjectWithRelations),
      phase: active?.phase ?? null,
      progressPercent: active?.progressPercent ?? null,
    }
  })

  // ── Releases deployed this month ──
  const releasesDeployedThisMonth: SnapshotRelease[] = releases
    .filter((r) => r.releaseDate && r.releaseDate >= monthStart && r.releaseDate < monthEnd)
    .map((r) => ({ projectName: r.project.name, version: r.version, releaseDate: r.releaseDate!.toISOString() }))

  // ── Cost savings (lifetime totals, same figures as the Dashboard) ──
  const costTotals = costSavingsTotals(releases)

  // ── Workload: avg utilization + overloaded count for this month ──
  const hoursByPerson = new Map<string, number>()
  for (const e of workloadEntries) {
    if (monthKey(e.month) !== key) continue
    hoursByPerson.set(e.personId, (hoursByPerson.get(e.personId) ?? 0) + e.hours)
  }
  let utilizationSum = 0
  let overloadedCount = 0
  for (const p of people) {
    const target = p.monthlyCapacityHours * TARGET_RATIO
    const hours = hoursByPerson.get(p.id) ?? 0
    const pct = target > 0 ? (hours / target) * 100 : 0
    utilizationSum += pct
    if (pct > 110) overloadedCount++
  }
  const avgUtilizationPct = people.length > 0 ? Math.round((utilizationSum / people.length) * 10) / 10 : 0

  // ── Interrupts this month ──
  const totalInterruptHours = interrupts.reduce((s, i) => s + i.hours, 0)
  const teamCapacity = people.reduce((s, p) => s + p.monthlyCapacityHours, 0)
  const bySource = new Map<string, number>()
  for (const i of interrupts) bySource.set(i.source, (bySource.get(i.source) ?? 0) + i.hours)
  const topSource = [...bySource.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // ── Pending decisions & top risks ──
  const pendingDecisions: SnapshotDecision[] = releases
    .filter((r) => r.needsDecision)
    .map((r) => ({ projectName: r.project.name, version: r.version, note: r.decisionNote }))

  const risksRaw = await prisma.risk.findMany({
    include: { release: { select: { version: true, project: { select: { name: true } } } } },
  })
  const topRisks: SnapshotRisk[] = risksRaw
    .map((r) => ({
      projectName: r.release.project.name,
      version: r.release.version,
      description: r.description,
      severity: worseSeverity(r.likelihood, r.impact),
    }))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 10)

  return {
    projects: snapshotProjects,
    releasesDeployedThisMonth,
    costSavings: { internalTotal: costTotals.internal, vendorTotal: costTotals.vendor, saveTotal: costTotals.save },
    workload: { avgUtilizationPct, overloadedCount },
    interrupts: {
      totalHours: totalInterruptHours,
      pctOfCapacity: teamCapacity > 0 ? Math.round((totalInterruptHours / teamCapacity) * 1000) / 10 : 0,
      topSource,
    },
    pendingDecisions,
    topRisks,
  }
}
