import { RAGBadge } from "@/components/ui/RAGBadge"
import { PhaseBadge } from "@/components/ui/PhaseBadge"
import { PortfolioBadge } from "@/components/ui/PortfolioBadge"
import { formatDateShort } from "@/lib/utils/date"
import { ROLE_LABELS } from "@/lib/types"
import type { ProjectWithRelations, ProjectMember } from "@/lib/types"

interface ProjectAssignmentCardProps {
  project: ProjectWithRelations
  membership: ProjectMember
}

export function ProjectAssignmentCard({ project, membership }: ProjectAssignmentCardProps) {
  return (
    <div className="border border-border rounded-card p-4 bg-card hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <RAGBadge status={project.ragStatus} showLabel={false} />
          <span className="font-semibold text-text-primary">{project.name}</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <PortfolioBadge bucket={(project as any).strategicBucket} />
          <PhaseBadge phase={project.phase} />
        </div>
      </div>

      {/* Role + allocation + dates */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted mb-3">
        <span>Role: <strong className="text-text-primary">{ROLE_LABELS[membership.role]}</strong></span>
        {membership.allocationPercent != null && (
          <span>Allocation: <strong className="text-text-primary">{membership.allocationPercent}%</strong></span>
        )}
        <span>
          {formatDateShort(membership.startDate)}
          {membership.endDate ? ` – ${formatDateShort(membership.endDate)}` : " – ongoing"}
        </span>
      </div>

      {/* Responsibilities */}
      {membership.responsibilities.length > 0 && (
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Responsibilities</p>
          <ul className="flex flex-col gap-1">
            {membership.responsibilities.map((r, i) => (
              <li key={i} className="text-sm text-text-primary flex items-start gap-1.5">
                <span className="text-accent mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
