import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { formatDate } from "@/lib/utils/date"

interface WeekNavProps {
  weekStart: Date
  weekEnd: Date
  isCurrentWeek: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function WeekNav({ weekStart, weekEnd, isCurrentWeek, onPrev, onNext, onToday }: WeekNavProps) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrev} className="p-1.5 rounded hover:bg-gray-100 text-text-muted transition-colors">
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium text-text-primary min-w-56 text-center">
        {formatDate(weekStart)} – {formatDate(weekEnd)}
        {isCurrentWeek && <span className="ml-1.5 text-xs font-semibold text-accent">(This Week)</span>}
      </span>
      <button onClick={onNext} className="p-1.5 rounded hover:bg-gray-100 text-text-muted transition-colors">
        <ChevronRight size={16} />
      </button>
      {!isCurrentWeek && (
        <button
          onClick={onToday}
          className="ml-1 flex items-center gap-1 px-3 py-1.5 rounded border border-accent text-accent text-sm hover:bg-accent-light transition-colors"
        >
          <CalendarDays size={14} />
          This Week
        </button>
      )}
    </div>
  )
}
