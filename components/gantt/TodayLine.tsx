import { getTodayLeft } from "@/lib/utils/gantt"

interface TodayLineProps {
  viewStart: Date
  totalDays: number
  labelWidth: number
}

export function TodayLine({ viewStart, totalDays, labelWidth }: TodayLineProps) {
  const left = getTodayLeft(viewStart, totalDays)

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-10"
      style={{ left: `calc(${labelWidth}px + ${left})` }}
    >
      <div className="h-full w-0.5 border-l-2 border-dashed border-accent opacity-70" />
    </div>
  )
}
