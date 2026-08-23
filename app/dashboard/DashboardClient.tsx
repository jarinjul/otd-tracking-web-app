"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { ProjectDetailPanel } from "@/components/project/ProjectDetailPanel"
import { worstRagStatus } from "@/lib/utils/rag"
import { pickActiveRelease } from "@/lib/utils/release"
import { costSavingsTotals } from "@/lib/utils/cost"
import { TARGET_RATIO, monthKey, workloadStatus } from "@/lib/utils/workload"
import { formatDateShort } from "@/lib/utils/date"
import type { ProjectWithRelations, ReleaseWithRelations, RagStatus } from "@/lib/types"

type PersonOpt = { id: string; name: string; avatarUrl: string | null; monthlyCapacityHours: number }
type WorkloadEntryOpt = { releaseId: string; personId: string; month: Date | string; hours: number }
type InterruptOpt = { date: Date | string; hours: number }
type FlatRelease = ReleaseWithRelations & { projectId: string; projectName: string }

interface DashboardClientProps {
  projects: ProjectWithRelations[]
  people: PersonOpt[]
  workloadEntries: WorkloadEntryOpt[]
  interrupts: InterruptOpt[]
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}
function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}

function formatCompactBaht(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M฿`
  return `${Math.round(n).toLocaleString("en-US")}฿`
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

// "Completed and (releaseDate ?? endDate) < month-end" vs "(startDate ?? createdAt) < month-end" —
// counted independently per the spec, both excluding rolled_back. UTC boundaries throughout: this
// compares against Date values pulled straight from the DB, and must stay consistent regardless of
// which timezone the browser evaluating it happens to be in.
function completionRateAt(releases: FlatRelease[], year: number, month1to12: number): number {
  const boundary = new Date(Date.UTC(year, month1to12, 1)) // exclusive end of month `month1to12`
  let num = 0
  let den = 0
  for (const r of releases) {
    if (r.status === "rolled_back") continue
    const doneRef = r.releaseDate ?? r.endDate
    if (r.status === "deployed" && doneRef && new Date(doneRef) < boundary) num++
    const startRef = r.startDate ?? r.createdAt
    if (startRef && new Date(startRef) < boundary) den++
  }
  return den > 0 ? Math.round((num / den) * 1000) / 10 : 0
}

const RAG_BADGE: Record<RagStatus, { label: string; bg: string; text: string }> = {
  green: { label: "Healthy", bg: "var(--color-rag-green-light)", text: "var(--color-rag-green-text)" },
  amber: { label: "At Risk", bg: "var(--color-rag-amber-light)", text: "var(--color-rag-amber-text)" },
  red: { label: "Critical", bg: "var(--color-rag-red-light)", text: "var(--color-rag-red-text)" },
}
const RAG_BAR_COLOR: Record<RagStatus, string> = {
  green: "var(--color-rag-green)",
  amber: "var(--color-rag-amber)",
  red: "var(--color-rag-red)",
}

type ProgressBucket = "done" | "progress" | "review" | "notstarted"
const PROGRESS_BUCKETS: { key: ProgressBucket; label: string; color: string }[] = [
  { key: "done", label: "เสร็จสิ้น", color: "var(--color-rag-green)" },
  { key: "progress", label: "กำลังดำเนินการ", color: "var(--color-accent)" },
  { key: "review", label: "รอการตรวจสอบ", color: "var(--color-rag-amber)" },
  { key: "notstarted", label: "ยังไม่เริ่ม", color: "var(--color-gray-400)" },
]
function releaseBucket(r: FlatRelease): ProgressBucket | null {
  if (r.status === "rolled_back") return null
  if (r.status === "deployed") return "done"
  if (r.status === "in_progress") return r.phase === "testing" || r.phase === "uat" ? "review" : "progress"
  if (r.status === "planned") return "notstarted"
  return null
}

function KpiCard({ label, value, valueColor, subtitle }: { label: string; value: React.ReactNode; valueColor?: string; subtitle?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-card px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-xl font-bold mt-0.5" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
      {subtitle && <p className="text-xs mt-0.5 text-text-muted truncate">{subtitle}</p>}
    </div>
  )
}

export function DashboardClient({ projects, people, workloadEntries, interrupts }: DashboardClientProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()))
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [completionInfoOpen, setCompletionInfoOpen] = useState(false)

  const isCurrentMonth = selectedMonth === monthKey(new Date())
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const allReleases: FlatRelease[] = useMemo(
    () => projects.flatMap((p) => p.releases.map((r) => ({ ...r, projectId: p.id, projectName: p.name }))),
    [projects]
  )

  // ── KPI row ──
  const bucketCount = useMemo(() => new Set(projects.map((p) => (p as any).strategicBucket).filter(Boolean)).size, [projects])

  const ragCounts = useMemo(() => {
    let amber = 0, red = 0
    for (const p of projects) {
      const rag = worstRagStatus(p)
      if (rag === "amber") amber++
      if (rag === "red") red++
    }
    return { amber, red }
  }, [projects])

  const releasesThisMonth = useMemo(
    () => allReleases.filter((r) => {
      const ref = r.releaseDate ?? r.endDate
      return ref && monthKey(ref) === selectedMonth
    }).length,
    [allReleases, selectedMonth]
  )

  const teamCapacity = useMemo(() => people.reduce((s, p) => s + p.monthlyCapacityHours, 0), [people])
  const interruptHoursThisMonth = useMemo(
    () => interrupts.filter((i) => monthKey(i.date) === selectedMonth).reduce((s, i) => s + i.hours, 0),
    [interrupts, selectedMonth]
  )
  const interruptPct = teamCapacity > 0 ? Math.round((interruptHoursThisMonth / teamCapacity) * 1000) / 10 : 0

  const costTotals = useMemo(() => costSavingsTotals(allReleases), [allReleases])

  const pendingDecisions = useMemo(() => allReleases.filter((r) => r.needsDecision), [allReleases])

  const monthTotalsByPerson = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of workloadEntries) {
      if (monthKey(e.month) !== selectedMonth) continue
      totals[e.personId] = (totals[e.personId] ?? 0) + e.hours
    }
    return totals
  }, [workloadEntries, selectedMonth])

  const workloadRows = useMemo(() => {
    return people
      .map((p) => {
        const target = p.monthlyCapacityHours * TARGET_RATIO
        const total = monthTotalsByPerson[p.id] ?? 0
        const pct = target > 0 ? Math.round((total / target) * 1000) / 10 : 0
        return { person: p, pct, status: workloadStatus(pct) }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [people, monthTotalsByPerson])

  const overloadedCount = useMemo(() => workloadRows.filter((r) => r.pct > 110).length, [workloadRows])

  // ── Project portfolio table ──
  const portfolioRows = useMemo(() => {
    const rows = projects.map((p) => {
      const active = pickActiveRelease(p.releases)
      const rag = worstRagStatus(p)
      const owner = p.teamMembers.find((m) => m.role === "ProjectManager")?.person ?? p.teamMembers[0]?.person ?? null
      // PO is set directly on the project (business-side role), not looked up from the dev-team roster.
      const po = (p as any).productOwnerName ? { name: (p as any).productOwnerName as string, avatarUrl: (p as any).productOwnerAvatar as string | null } : null
      const due = active?.endDate ? new Date(active.endDate) : null
      const overdue = !!(due && due < today && active?.status !== "deployed")
      return { project: p, active, rag, owner, po, due, overdue }
    })
    return rows.sort((a, b) => {
      const rank = (r: typeof a) => (r.due ? (r.overdue ? 0 : 1) : 2)
      const rd = rank(a) - rank(b)
      if (rd !== 0) return rd
      if (a.due && b.due) return a.due.getTime() - b.due.getTime()
      return 0
    })
  }, [projects, today])

  const visiblePortfolioRows = showAllProjects ? portfolioRows : portfolioRows.slice(0, 8)
  const openProject = projects.find((p) => p.id === openProjectId) ?? null

  // ── Release progress + completion rate ──
  const progressCounts = useMemo(() => {
    const counts: Record<ProgressBucket, number> = { done: 0, progress: 0, review: 0, notstarted: 0 }
    let total = 0
    for (const r of allReleases) {
      const bucket = releaseBucket(r)
      if (!bucket) continue
      counts[bucket]++
      total++
    }
    return { counts, total }
  }, [allReleases])

  const completionTrend = useMemo(() => {
    const keys: string[] = []
    for (let i = 5; i >= 0; i--) keys.push(addMonths(selectedMonth, -i))
    return keys.map((key) => {
      const [y, m] = key.split("-").map(Number)
      return { key, monthIndex0: m - 1, rate: completionRateAt(allReleases, y, m) }
    })
  }, [allReleases, selectedMonth])

  const currentRate = completionTrend[5].rate
  const previousRate = completionTrend[4].rate
  const rateDelta = Math.round((currentRate - previousRate) * 10) / 10

  // ── Upcoming releases (always "now", not month-scoped) ──
  const upcomingReleases = useMemo(() => {
    return allReleases
      .filter((r) => (r.status === "planned" || r.status === "in_progress"))
      .map((r) => ({ r, due: r.releaseDate ?? r.endDate }))
      .filter((x): x is { r: FlatRelease; due: Date } => !!x.due && new Date(x.due) >= today)
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
      .slice(0, 5)
  }, [allReleases, today])

  return (
    <div className="px-6 py-5 overflow-y-auto flex-1">
      {/* Header + month selector */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Executive Overview</h1>
          <p className="text-sm text-text-muted mt-0.5">ภาพรวมสถานะโครงการและทีม</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-card px-2 py-1">
            <button type="button" onClick={() => setSelectedMonth((m) => addMonths(m, -1))} className="p-1 rounded hover:bg-gray-100 text-text-muted">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-text-primary w-20 text-center">{monthLabel(selectedMonth)}</span>
            <button type="button" onClick={() => setSelectedMonth((m) => addMonths(m, 1))} className="p-1 rounded hover:bg-gray-100 text-text-muted">
              <ChevronRight size={16} />
            </button>
          </div>
          {!isCurrentMonth && (
            <button type="button" onClick={() => setSelectedMonth(monthKey(new Date()))} className="text-xs font-medium text-accent hover:underline">
              This month
            </button>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Active projects" value={projects.length} subtitle={`${bucketCount} buckets`} />
        <KpiCard
          label="At risk / critical"
          value={<>{ragCounts.amber} <span style={{ color: "var(--color-rag-red)" }}>/ {ragCounts.red}</span></>}
        />
        <KpiCard label="Releases เดือนนี้" value={releasesThisMonth} subtitle={monthLabel(selectedMonth)} />
        <KpiCard label="งานแทรกเดือนนี้" value={`${Math.round(interruptHoursThisMonth)}h`} subtitle={`${interruptPct}% ของ capacity`} />
        <KpiCard
          label="Cost save"
          value={<>{formatCompactBaht(costTotals.save)} <span className="text-xs" style={{ color: "var(--color-rag-green-text)" }}>{costTotals.savePct}%</span></>}
        />
        <KpiCard
          label="รอตัดสินใจ"
          value={pendingDecisions.length}
          subtitle={pendingDecisions[0] ? `${pendingDecisions[0].projectName}${pendingDecisions[0].decisionNote ? " · " + truncate(pendingDecisions[0].decisionNote, 20) : ""}` : "—"}
        />
        <KpiCard
          label="Overloaded เดือนนี้"
          value={`${overloadedCount} คน`}
          valueColor={overloadedCount > 0 ? "var(--color-rag-red)" : undefined}
        />
        <div className="bg-card border border-border rounded-card px-4 py-3">
          <p className="text-xs text-text-muted">Team members</p>
          <p className="text-xl font-bold mt-0.5">{people.length}</p>
          <div className="flex items-center mt-1">
            {people.slice(0, 4).map((p, i) => (
              <div key={p.id} style={{ marginLeft: i === 0 ? 0 : -8, border: "2px solid var(--color-card)", borderRadius: "9999px" }}>
                <Avatar name={p.name} avatarUrl={p.avatarUrl} size="sm" />
              </div>
            ))}
            {people.length > 4 && (
              <div
                style={{ marginLeft: -8, border: "2px solid var(--color-card)" }}
                className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-[10px] text-text-muted"
              >
                +{people.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle row: portfolio table + release progress */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3 mb-4">
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-sm font-semibold text-text-primary mb-3">Project portfolio</p>
          <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="text-left text-text-muted">
                <th className="font-normal pb-2">Project</th>
                <th className="font-normal pb-2 w-12">PM</th>
                <th className="font-normal pb-2 w-12">PO</th>
                <th className="font-normal pb-2 w-24">Health</th>
                <th className="font-normal pb-2 w-28">Progress</th>
                <th className="font-normal pb-2 w-20">Due date</th>
                <th className="font-normal pb-2 w-24">Release</th>
              </tr>
            </thead>
            <tbody>
              {visiblePortfolioRows.map(({ project, active, rag, owner, po, due, overdue }) => (
                <tr
                  key={project.id}
                  className="border-t border-border cursor-pointer hover:bg-gray-50"
                  onClick={() => setOpenProjectId(project.id)}
                >
                  <td className="py-2 pr-2 text-text-primary truncate max-w-0">{project.name}</td>
                  <td className="py-2">
                    {owner ? (
                      <span title={owner.name}>
                        <Avatar name={owner.name} avatarUrl={owner.avatarUrl} size="sm" />
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2">
                    {po ? (
                      <span title={po.name}>
                        <Avatar name={po.name} avatarUrl={po.avatarUrl} size="sm" />
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded-badge" style={{ background: RAG_BADGE[rag].bg, color: RAG_BADGE[rag].text }}>
                      {RAG_BADGE[rag].label}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="bg-surface rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${active?.progressPercent ?? 0}%`, background: RAG_BAR_COLOR[rag] }} />
                    </div>
                  </td>
                  <td className="py-2" style={overdue ? { color: "var(--color-rag-red)" } : { color: "var(--color-text-muted)" }}>
                    {due ? formatDateShort(due) : "—"}
                  </td>
                  <td className="py-2 text-text-muted">{active?.version ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {portfolioRows.length > 8 && (
            <button type="button" onClick={() => setShowAllProjects((v) => !v)} className="mt-3 text-xs font-medium text-accent hover:underline">
              {showAllProjects ? "ย่อรายการ" : `ดูทั้งหมด ${portfolioRows.length} โปรเจกต์`} →
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-sm font-semibold text-text-primary mb-3">Project release progress (all projects)</p>
          <div className="flex items-center gap-4">
            <ProgressDonut counts={progressCounts.counts} total={progressCounts.total} />
            <div className="flex flex-col gap-1.5 text-xs flex-1">
              {PROGRESS_BUCKETS.map((b) => {
                const count = progressCounts.counts[b.key]
                const pct = progressCounts.total > 0 ? Math.round((count / progressCounts.total) * 100) : 0
                return (
                  <div key={b.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: b.color }} />
                      {b.label}
                    </span>
                    <span className="font-medium text-text-primary">{count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border mt-3 pt-3">
            <div className="flex items-center gap-1.5 relative">
              <p className="text-xs text-text-muted">Completion rate</p>
              <button
                type="button"
                onClick={() => setCompletionInfoOpen((o) => !o)}
                className="w-3.5 h-3.5 rounded-full text-[10px] leading-none flex items-center justify-center border shrink-0"
                style={{
                  borderColor: completionInfoOpen ? "var(--color-accent)" : "var(--color-border)",
                  color: completionInfoOpen ? "white" : "var(--color-accent)",
                  background: completionInfoOpen ? "var(--color-accent)" : "transparent",
                }}
                title="Completion rate คำนวณจากอะไร?"
              >
                i
              </button>

              {completionInfoOpen && (
                <div
                  className="absolute z-10 top-full left-0 mt-1 rounded-xl border shadow-lg p-4 flex flex-col gap-2.5"
                  style={{ width: 320, background: "var(--color-card)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
                      Completion rate คำนวณยังไง?
                    </p>
                    <button
                      type="button"
                      onClick={() => setCompletionInfoOpen(false)}
                      className="text-sm leading-none"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    นับเป็นราย <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>Release</span> (ไม่ใช่รายโปรเจกต์) โดยไม่รวม Release ที่ถูก <span className="font-semibold">rolled back</span>
                  </p>
                  <div className="rounded-lg px-3 py-2 flex flex-col gap-1" style={{ background: "var(--color-surface)" }}>
                    <p className="text-xs" style={{ color: "var(--color-text-primary)" }}>
                      <span className="font-semibold" style={{ color: "var(--color-rag-green-text)" }}>Release ที่ deploy สำเร็จแล้ว</span> ภายในเดือนนั้น
                    </p>
                    <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>÷</p>
                    <p className="text-xs" style={{ color: "var(--color-text-primary)" }}>
                      <span className="font-semibold" style={{ color: "var(--color-accent)" }}>Release ที่เริ่มไปแล้ว</span> ภายในเดือนนั้น (นับจากวันเริ่ม)
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    เช่น เดือนนี้มี Release ที่เริ่มไปแล้ว 10 ตัว deploy สำเร็จแล้ว 6 ตัว → Completion rate = 6 ÷ 10 = <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>60%</span>
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    ตัวเลข % ข้างล่างกราฟ (เช่น "↗15.2% จากเดือนก่อน") คือส่วนต่างเทียบกับ Completion rate ของเดือนก่อนหน้า
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">{currentRate}%</span>
              <span
                className="text-xs flex items-center gap-0.5"
                style={{ color: rateDelta >= 0 ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}
              >
                {rateDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(rateDelta)}% จากเดือนก่อน
              </span>
            </div>
            <CompletionTrendChart points={completionTrend} />
          </div>
        </div>
      </div>

      {/* Bottom row: team workload + upcoming releases */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3">
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-sm font-semibold text-text-primary mb-3">Team workload (เดือนที่เลือก)</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
            {workloadRows.map(({ person, pct, status }) => (
              <div key={person.id} className="flex items-center gap-2 min-w-0">
                <Avatar name={person.name} avatarUrl={person.avatarUrl} size="md" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-text-secondary">{person.name}</span>
                    <span className="font-semibold shrink-0" style={{ color: status.color }}>{pct}%</span>
                  </div>
                  <div className="bg-surface rounded-full h-1.5 mt-0.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: status.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-sm font-semibold text-text-primary mb-3">Upcoming releases</p>
          <div className="flex flex-col gap-2 text-xs">
            {upcomingReleases.length === 0 && <p className="text-text-muted">ไม่มี release ที่กำลังจะถึง</p>}
            {upcomingReleases.map(({ r, due }) => {
              const daysUntil = Math.ceil((new Date(due).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-text-primary truncate">{r.projectName} {r.version}</span>
                  <span className="shrink-0" style={{ color: "var(--color-accent)" }}>
                    {daysUntil === 0 ? "Today" : `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ProjectDetailPanel project={openProject} onClose={() => setOpenProjectId(null)} />
    </div>
  )
}

// Renders the trend as a full-width HTML+SVG hybrid rather than a single scaled <svg>: a fixed
// Standard percentage-donut trick: a circle with r=15.9155 has circumference ≈100, so each
// segment's stroke-dasharray can use raw percentage values directly with no extra math, and
// dashoffset just walks backward from 25 (12 o'clock) by each prior segment's share in turn.
function ProgressDonut({ counts, total }: { counts: Record<ProgressBucket, number>; total: number }) {
  const R = 15.9155
  let offset = 25
  const segments = PROGRESS_BUCKETS.map((b) => {
    const count = counts[b.key]
    const pct = total > 0 ? (count / total) * 100 : 0
    const seg = { ...b, pct, dashoffset: offset }
    offset -= pct
    return seg
  }).filter((s) => s.pct > 0)

  return (
    <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
      <svg viewBox="0 0 36 36" width="96" height="96">
        <circle cx="18" cy="18" r={R} fill="none" stroke="var(--color-surface)" strokeWidth="4" />
        {segments.map((s) => (
          <circle
            key={s.key}
            cx="18"
            cy="18"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="4"
            strokeDasharray={`${s.pct} ${100 - s.pct}`}
            strokeDashoffset={s.dashoffset}
            strokeLinecap={segments.length === 1 ? "butt" : "round"}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-text-primary">{total}</span>
        <span className="text-[10px] text-text-muted">Releases</span>
      </div>
    </div>
  )
}

// height with width:100% forces the browser to scale the viewBox to fit the SHORTER dimension
// (the height), so the chart stays tiny and centered no matter how wide the card is. Splitting it
// — an SVG stretched with preserveAspectRatio="none" for just the line/fill (harmless to distort;
// it's a trend line) and plain positioned HTML for the dots and text (which would look visibly
// stretched if they lived inside that same distorted SVG) — is what actually fills the card.
function CompletionTrendChart({ points }: { points: { key: string; monthIndex0: number; rate: number }[] }) {
  const Y_TOP = 12, Y_BOTTOM = 88 // percent of plot-area height

  const coords = points.map((p, i) => ({
    ...p,
    xPct: points.length > 1 ? (i / (points.length - 1)) * 100 : 50,
    yPct: Y_BOTTOM - (p.rate / 100) * (Y_BOTTOM - Y_TOP),
  }))
  const linePoints = coords.map((c) => `${c.xPct},${c.yPct}`).join(" ")
  const areaPoints = `0,100 ${linePoints} 100,100`
  const lastIdx = coords.length - 1

  return (
    <div className="mt-3">
      <div className="relative w-full" style={{ height: 120 }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0"
          role="img"
        >
          <title>Completion rate trend, last 6 months</title>
          <polygon points={areaPoints} fill="var(--color-rag-green-light)" opacity={0.6} />
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--color-rag-green)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {coords.map((c, i) => (
          <div key={c.key} className="absolute" style={{ left: `${c.xPct}%`, top: `${c.yPct}%`, transform: "translate(-50%, -50%)" }}>
            <span
              className="absolute whitespace-nowrap text-xs"
              style={{
                bottom: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                marginBottom: 6,
                color: "var(--color-rag-green-text)",
                fontWeight: i === lastIdx ? 600 : 500,
              }}
            >
              {c.rate}%
            </span>
            <div
              className="rounded-full"
              style={{
                width: i === lastIdx ? 10 : 7,
                height: i === lastIdx ? 10 : 7,
                background: "var(--color-rag-green)",
                border: "2px solid var(--color-card)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {coords.map((c) => (
          <span key={`month-${c.key}`} className="text-xs text-text-muted">
            {MONTH_NAMES[c.monthIndex0]}
          </span>
        ))}
      </div>
    </div>
  )
}
