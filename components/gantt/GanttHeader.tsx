import { addDays, ganttWeekLabel, ganttMonthLabel } from "@/lib/utils/date"
import type { GanttViewMode } from "@/lib/types"

interface GanttHeaderProps {
  viewStart: Date
  totalDays: number
  viewMode: GanttViewMode
  labelWidth: number
}

export function GanttHeader({ viewStart, totalDays, viewMode, labelWidth }: GanttHeaderProps) {
  const cells: { label: string; pct: number }[] = []

  if (viewMode === "month") {
    // Group by month
    const months: Record<string, number> = {}
    for (let d = 0; d < totalDays; d++) {
      const key = ganttMonthLabel(addDays(viewStart, d))
      months[key] = (months[key] ?? 0) + 1
    }
    for (const [label, days] of Object.entries(months)) {
      cells.push({ label, pct: (days / totalDays) * 100 })
    }
  } else if (viewMode === "week") {
    // Group by week
    const weeks: Record<string, number> = {}
    for (let d = 0; d < totalDays; d++) {
      const date = addDays(viewStart, d)
      const key = `${date.getFullYear()}-${ganttWeekLabel(date)}`
      weeks[key] = (weeks[key] ?? 0) + 1
    }
    for (const [key, days] of Object.entries(weeks)) {
      cells.push({ label: key.split("-").slice(1).join(" "), pct: (days / totalDays) * 100 })
    }
  } else {
    // day mode: show every 2nd day
    for (let d = 0; d < totalDays; d += 2) {
      const date = addDays(viewStart, d)
      cells.push({
        label: date.getDate().toString(),
        pct: (Math.min(2, totalDays - d) / totalDays) * 100,
      })
    }
  }

  return (
    <div className="flex" style={{ borderBottom: "1px solid #E5E7EB" }}>
      {/* label col */}
      <div className="shrink-0 bg-gray-50 border-r border-border" style={{ width: labelWidth }} />
      {/* header cells */}
      <div className="flex flex-1 bg-gray-50">
        {cells.map((c, i) => (
          <div
            key={i}
            className="shrink-0 px-2 py-2 text-xs font-medium text-text-muted border-r border-border truncate"
            style={{ width: `${c.pct}%` }}
          >
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}
