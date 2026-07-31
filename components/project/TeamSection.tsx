import { Avatar } from "@/components/ui/Avatar"
import { formatDateShort } from "@/lib/utils/date"
import { ROLE_LABELS } from "@/lib/types"
import type { ProjectWithRelations } from "@/lib/types"

interface TeamSectionProps {
  project: ProjectWithRelations
}

export function TeamSection({ project }: TeamSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {project.teamMembers.map((member) => (
        <div key={member.id} className="flex gap-3">
          <Avatar name={member.person.name} avatarUrl={member.person.avatarUrl} size="md" className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-text-primary">{member.person.name}</span>
              <span className="text-xs text-text-muted bg-gray-100 px-2 py-0.5 rounded-badge">
                {ROLE_LABELS[member.role]}
              </span>
              {member.allocationPercent && (
                <span className="text-xs text-text-muted">{member.allocationPercent}%</span>
              )}
            </div>
            {member.responsibilities.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {member.responsibilities.map((r, i) => (
                  <li key={i} className="text-xs text-text-muted flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-xs text-text-muted mt-1">
              {formatDateShort(member.startDate)}
              {member.endDate ? ` – ${formatDateShort(member.endDate)}` : " – ongoing"}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
