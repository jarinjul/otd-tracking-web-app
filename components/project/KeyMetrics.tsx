import { formatDate, countdownLabel, daysBetween, isOverdue } from "@/lib/utils/date"
import { ProgressBar } from "@/components/ui/ProgressBar"
import type { ProjectWithRelations } from "@/lib/types"
import { PHASE_LABELS } from "@/lib/types"

interface KeyMetricsProps {
  project: ProjectWithRelations
}

export function KeyMetrics({ project }: KeyMetricsProps) {
  const duration = daysBetween(new Date(project.startDate), new Date(project.deadline))
  const budgetPct = project.budgetTotal ? Math.round(((project.budgetUsed ?? 0) / project.budgetTotal) * 100) : null
  const overdue = isOverdue(project.deadline)
  const countdown = countdownLabel(project.deadline)

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Progress</span>
        <span className="text-2xl font-bold text-text-primary">{project.progressPercent}%</span>
        <ProgressBar value={project.progressPercent} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Deadline</span>
        <span className="text-sm font-semibold text-text-primary">{formatDate(project.deadline)}</span>
        <span className={`text-xs font-medium ${overdue ? "text-rag-red" : "text-text-muted"}`}>
          {overdue && "⚠ "}{countdown}
        </span>
      </div>

      {budgetPct !== null && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Budget</span>
          <span className="text-sm font-semibold text-text-primary">
            {project.budgetUsed?.toLocaleString()} / {project.budgetTotal?.toLocaleString()} {project.currency}
          </span>
          <ProgressBar
            value={budgetPct}
            colorClass={budgetPct > 90 ? "bg-rag-red" : budgetPct > 70 ? "bg-rag-amber" : "bg-rag-green"}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Duration</span>
        <span className="text-sm font-semibold text-text-primary">{duration} days</span>
        <span className="text-xs text-text-muted">
          {formatDate(project.startDate)} – {formatDate(project.deadline)}
        </span>
      </div>

      <div className="col-span-2 flex flex-col gap-1">
        <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Phase</span>
        <span className="text-sm font-semibold text-text-primary">{PHASE_LABELS[project.phase]}</span>
      </div>
    </div>
  )
}
