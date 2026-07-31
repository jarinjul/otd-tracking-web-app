import { RAGBadge } from "@/components/ui/RAGBadge"
import { PortfolioBadge } from "@/components/ui/PortfolioBadge"
import { PhaseBadge } from "@/components/ui/PhaseBadge"
import { formatDate, formatDateShort, countdownLabel, isOverdue } from "@/lib/utils/date"
import { BUCKET_KEYS, BUCKET_LABELS } from "@/lib/types"
import type { ProjectWithRelations } from "@/lib/types"
import { ClipboardList } from "lucide-react"

interface ReportViewProps {
  projects: ProjectWithRelations[]
  preparedBy?: string
}

export function ReportView({ projects, preparedBy = "Zenith Hub" }: ReportViewProps) {
  const today = new Date()
  const month = today.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  // Counts per strategic bucket
  const bucketStats = (bucket: string) => {
    const g = projects.filter((p) => ((p as any).strategicBucket ?? null) === bucket)
    return {
      total: g.length,
      green: g.filter((p) => p.ragStatus === "green").length,
      amber: g.filter((p) => p.ragStatus === "amber").length,
      red:   g.filter((p) => p.ragStatus === "red").length,
    }
  }

  const decisions = projects.filter((p) => p.needsDecision)

  return (
    <div className="font-sans text-text-primary">
      {/* Report header */}
      <div className="mb-8 pb-4 border-b-2 border-primary">
        <h1 className="text-2xl font-bold text-primary mb-1">PROJECT STATUS REPORT</h1>
        <div className="text-sm text-text-muted flex gap-4">
          <span>Prepared by: <strong className="text-text-primary">{preparedBy}</strong></span>
          <span>Date: <strong className="text-text-primary">{formatDate(today)}</strong></span>
          <span>Period: <strong className="text-text-primary">{month}</strong></span>
        </div>
      </div>

      {/* Executive Summary */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-primary mb-4">EXECUTIVE SUMMARY OVERVIEW</h2>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {BUCKET_KEYS.map((k) => {
            const s = bucketStats(k)
            if (s.total === 0) return null
            return (
              <div key={k} className="border border-border rounded-card p-3">
                <div className="text-xs font-semibold text-text-muted mb-2">{BUCKET_LABELS[k]}</div>
                <div className="flex gap-3 text-sm">
                  <span className="text-text-muted">Total: <strong className="text-text-primary">{s.total}</strong></span>
                  <span className="text-rag-green-text">🟢 {s.green}</span>
                  <span className="text-rag-amber-text">🟡 {s.amber}</span>
                  <span className="text-rag-red-text">🔴 {s.red}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Management Actions */}
      {decisions.length > 0 && (
        <section className="mb-8">
          <div className="bg-rag-amber-light border-l-4 border-l-rag-amber rounded-r-card p-4">
            <h2 className="font-bold text-rag-amber-text flex items-center gap-2 mb-3">
              <ClipboardList size={16} />
              MANAGEMENT ACTION REQUIRED
            </h2>
            <ul className="flex flex-col gap-2">
              {decisions.map((p) => (
                <li key={p.id} className="text-sm text-rag-amber-text">
                  • <strong>{p.name}:</strong> {p.decisionNote}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Per-project summaries */}
      <section>
        <h2 className="text-lg font-bold text-primary mb-4">PROJECT SUMMARIES</h2>
        <div className="flex flex-col gap-4">
          {projects.map((p) => {
            const pm = p.teamMembers.find((m) => m.role === "ProjectManager")
            const overdue = isOverdue(p.deadline)
            const releaseBlockers = (p.releases ?? []).flatMap((r) => r.blockers ?? [])
            const releaseNextSteps = (p.releases ?? []).flatMap((r) => r.nextSteps ?? [])
            const mainBlocker = releaseBlockers.find((b) => b.severity === "high")

            return (
              <div key={p.id} className="border border-border rounded-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <RAGBadge status={p.ragStatus} />
                  <PortfolioBadge bucket={(p as any).strategicBucket} />
                  <span className="font-semibold text-text-primary">{p.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-text-muted mb-2">
                  {pm && <span>PM: {pm.person.name}</span>}
                  <span>Progress: {p.progressPercent}%</span>
                  <PhaseBadge phase={p.phase} />
                </div>
                <div className="text-xs text-text-muted mb-2">
                  Timeline: {formatDateShort(p.startDate)} → {formatDateShort(p.deadline)}
                  {overdue && <span className="text-rag-red font-medium ml-2">⚠ {countdownLabel(p.deadline)}</span>}
                </div>
                {mainBlocker && (
                  <div className="text-xs text-rag-red-text bg-rag-red-light rounded px-2 py-1 mb-2">
                    Issue: {mainBlocker.description}
                  </div>
                )}
                {releaseNextSteps.slice(0, 1).map((s) => (
                  <div key={s.id} className="text-xs text-text-muted">
                    Next: {s.description} (Owner: {s.owner}, Due: {formatDateShort(s.dueDate)})
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
