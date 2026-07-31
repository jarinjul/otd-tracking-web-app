"use client"

import { useDashboardStore } from "@/lib/stores/dashboardStore"
import { RAGBadge } from "@/components/ui/RAGBadge"
import { PhaseBadge } from "@/components/ui/PhaseBadge"
import { Avatar } from "@/components/ui/Avatar"
import { formatDateShort } from "@/lib/utils/date"
import { worstRagStatus } from "@/lib/utils/rag"
import type { ProjectWithRelations, RagStatus } from "@/lib/types"

const MAX_STEPS_SHOWN = 2

const RAG_BORDER: Record<RagStatus, string> = {
  green: "border-l-rag-green",
  amber: "border-l-rag-amber",
  red:   "border-l-rag-red",
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-rag-red",
  medium: "bg-rag-amber",
  low: "bg-rag-green",
}
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

interface ProjectCardProps {
  project: ProjectWithRelations
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { setOpenProjectId } = useDashboardStore()
  const rag = worstRagStatus(project)
  const releases = project.releases ?? []
  const firstRelease = releases[0]
  const lastDate = firstRelease?.releaseDate ?? firstRelease?.endDate ?? firstRelease?.startDate ?? null
  const nextSteps = releases.flatMap((r) => r.nextSteps ?? [])

  return (
    <div
      onClick={() => setOpenProjectId(project.id)}
      className={`bg-card rounded-card border-l-4 ${RAG_BORDER[rag]} cursor-pointer hover:shadow-md transition-shadow`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-primary text-base leading-tight truncate flex-1 min-w-0">
            {project.name}
          </h3>
          <RAGBadge status={rag} showLabel={false} pulse={rag === "red"} />
        </div>

        {/* Avatars */}
        {project.teamMembers.length > 0 && (
          <div className="flex -space-x-1">
            {project.teamMembers.slice(0, 4).map((m) => (
              <Avatar key={m.id} name={m.person.name} avatarUrl={m.person.avatarUrl} size="sm" className="ring-2 ring-card" />
            ))}
            {project.teamMembers.length > 4 && (
              <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-text-muted ring-2 ring-card">
                +{project.teamMembers.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Releases & Deployments — first release only, full list is in the detail panel */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Releases & Deployments</p>
          {firstRelease ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-text-primary shrink-0">{firstRelease.version}</span>
                <RAGBadge status={firstRelease.ragStatus as RagStatus} showLabel={false} />
                <PhaseBadge phase={firstRelease.phase} />
                {lastDate && <span className="text-xs text-text-muted ml-auto shrink-0">{formatDateShort(lastDate)}</span>}
              </div>
              {releases.length > 1 && (
                <p className="text-xs text-text-muted mt-1.5">+{releases.length - 1} more release{releases.length - 1 > 1 ? "s" : ""} — click for detail</p>
              )}
            </>
          ) : (
            <p className="text-xs text-text-muted italic">No releases yet</p>
          )}
        </div>

        {/* Next Steps — highest priority, pending first */}
        {nextSteps.length > 0 && (() => {
          const sorted = [...nextSteps].sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1
            return (PRIORITY_ORDER[(a as any).priority ?? "medium"] ?? 1) - (PRIORITY_ORDER[(b as any).priority ?? "medium"] ?? 1)
          })
          return (
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Next Steps</p>
              <div className="flex flex-col gap-1.5">
                {sorted.slice(0, MAX_STEPS_SHOWN).map((s) => (
                  <div key={s.id} className="flex items-start gap-2">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${s.done ? "bg-gray-300" : PRIORITY_DOT[(s as any).priority ?? "medium"]}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${s.done ? "line-through text-text-muted" : "text-text-primary"} truncate`}>
                        {s.description}
                      </p>
                      <p className="text-xs text-text-muted">
                        {s.owner} · Due {formatDateShort(s.dueDate)}
                        {(s as any).effortDays != null && <> · {(s as any).effortDays}d</>}
                      </p>
                    </div>
                  </div>
                ))}
                {sorted.length > MAX_STEPS_SHOWN && (
                  <p className="text-xs text-text-muted">+{sorted.length - MAX_STEPS_SHOWN} more step{sorted.length - MAX_STEPS_SHOWN > 1 ? "s" : ""}</p>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
