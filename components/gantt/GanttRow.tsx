"use client"

import { ReleaseBar } from "@/components/gantt/ReleaseBar"
import { RAGBadge } from "@/components/ui/RAGBadge"
import type { ProjectWithRelations } from "@/lib/types"

interface GanttRowProps {
  project: ProjectWithRelations
  viewStart: Date
  totalDays: number
  labelWidth: number
  onReleaseClick?: (releaseId: string) => void
}

const RELEASE_LANE_HEIGHT = 18
const RELEASE_LANE_TOP_START = 10
const ROW_VERTICAL_PADDING = 8
const MIN_ROW_HEIGHT = 40

export function GanttRow({ project, viewStart, totalDays, labelWidth, onReleaseClick }: GanttRowProps) {
  const pm = project.teamMembers.find((m) => m.role === "ProjectManager")

  const releasesWithRange = (project.releases ?? []).filter((r) => r.startDate && r.endDate)
  const rowHeight = Math.max(
    MIN_ROW_HEIGHT,
    RELEASE_LANE_TOP_START + releasesWithRange.length * RELEASE_LANE_HEIGHT + ROW_VERTICAL_PADDING
  )

  return (
    <div
      className="flex border-b border-border"
      style={{ height: rowHeight }}
    >
      {/* Label column */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 border-r border-border bg-card"
        style={{ width: labelWidth }}
      >
        <RAGBadge status={project.ragStatus} showLabel={false} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{project.name}</p>
          {pm && <p className="text-xs text-text-muted truncate">PM: {pm.person.name.split(" ")[0]}</p>}
        </div>
      </div>

      {/* Timeline column — release bars only */}
      <div className="flex-1 relative overflow-hidden">
        {releasesWithRange.map((r, i) => (
          <ReleaseBar
            key={r.id}
            release={r}
            viewStart={viewStart}
            totalDays={totalDays}
            top={RELEASE_LANE_TOP_START + i * RELEASE_LANE_HEIGHT}
            onClick={() => onReleaseClick?.(r.id)}
          />
        ))}
      </div>
    </div>
  )
}
