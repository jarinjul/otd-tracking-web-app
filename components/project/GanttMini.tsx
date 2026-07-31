import { formatDateShort } from "@/lib/utils/date"
import { RAG_COLORS } from "@/lib/types"
import type { ProjectWithRelations } from "@/lib/types"

interface GanttMiniProps {
  project: ProjectWithRelations
}

export function GanttMini({ project }: GanttMiniProps) {
  const start = new Date(project.startDate)
  const end = new Date(project.deadline)
  const today = new Date()
  const total = Math.max(1, end.getTime() - start.getTime())
  const todayPct = Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / total) * 100))
  const fillPct = Math.min(100, ((today.getTime() - start.getTime()) / total) * 100)

  return (
    <div className="flex flex-col gap-2">
      {/* Bar */}
      <div className="relative h-5 rounded bg-gray-100 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded opacity-80"
          style={{ width: "100%", backgroundColor: RAG_COLORS[project.ragStatus] + "33" }}
        />
        <div
          className="absolute top-0 left-0 h-full rounded"
          style={{ width: `${Math.min(100, project.progressPercent)}%`, backgroundColor: RAG_COLORS[project.ragStatus] }}
        />
        {/* Today line */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            className="absolute top-0 w-0.5 h-full bg-accent"
            style={{ left: `${todayPct}%` }}
          />
        )}
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-xs text-text-muted">
        <span>{formatDateShort(project.startDate)}</span>
        <span className="text-accent font-medium">Today</span>
        <span>{formatDateShort(project.deadline)}</span>
      </div>
    </div>
  )
}
