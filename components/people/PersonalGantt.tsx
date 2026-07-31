import { getBarStyle } from "@/lib/utils/gantt"
import { RAG_COLORS } from "@/lib/types"
import { formatDateShort } from "@/lib/utils/date"
import { Tooltip } from "@/components/ui/Tooltip"
import type { ProjectWithRelations } from "@/lib/types"

interface PersonalGanttProps {
  projects: ProjectWithRelations[]
}

export function PersonalGantt({ projects }: PersonalGanttProps) {
  if (projects.length === 0) return null

  // Compute overall view range
  const allDates = projects.flatMap((p) => [new Date(p.startDate), new Date(p.deadline)])
  const viewStart = new Date(Math.min(...allDates.map((d) => d.getTime())))
  viewStart.setDate(1)
  const viewEnd = new Date(Math.max(...allDates.map((d) => d.getTime())))
  viewEnd.setMonth(viewEnd.getMonth() + 1, 0)
  const totalDays = Math.max(1, Math.round((viewEnd.getTime() - viewStart.getTime()) / 86400000))

  const today = new Date()
  const todayPct = ((today.getTime() - viewStart.getTime()) / (viewEnd.getTime() - viewStart.getTime())) * 100

  return (
    <div className="border border-border rounded-card overflow-hidden">
      {/* Date header */}
      <div className="flex items-center bg-gray-50 border-b border-border">
        <div className="w-28 shrink-0 px-3 py-2 border-r border-border text-xs font-medium text-text-muted">Project</div>
        <div className="flex-1 px-3 py-2 text-xs text-text-muted">
          {formatDateShort(viewStart)} → {formatDateShort(viewEnd)}
        </div>
      </div>

      {/* Rows */}
      <div className="relative">
        {/* Today line */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-accent z-10 pointer-events-none"
            style={{ left: `calc(7rem + ${todayPct * (100 / 100)}% - 7rem * ${todayPct / 100})` }}
          />
        )}

        {projects.map((p) => {
          const barStyle = getBarStyle(p, viewStart, totalDays)
          return (
            <div key={p.id} className="flex items-center border-b border-border last:border-0" style={{ height: 40 }}>
              <div className="w-28 shrink-0 px-3 text-xs font-medium text-text-primary truncate border-r border-border">
                {p.name}
              </div>
              <div className="flex-1 relative">
                <Tooltip content={`${p.name}: ${formatDateShort(p.startDate)} – ${formatDateShort(p.deadline)}`}>
                  <div
                    className="absolute top-2 h-5 rounded cursor-pointer opacity-80 hover:opacity-100"
                    style={{ ...barStyle, backgroundColor: RAG_COLORS[p.ragStatus] }}
                  />
                </Tooltip>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
