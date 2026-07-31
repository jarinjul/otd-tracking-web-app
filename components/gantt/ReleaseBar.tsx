import { Tooltip } from "@/components/ui/Tooltip"
import { getRangeBarStyle } from "@/lib/utils/gantt"
import { formatDateShort } from "@/lib/utils/date"
import type { Release } from "@/lib/types"

const STATUS_COLOR: Record<string, string> = {
  planned: "#9CA3AF",
  in_progress: "#6366F1",
  deployed: "#10B981",
  rolled_back: "#EF4444",
}

interface ReleaseBarProps {
  release: Release
  viewStart: Date
  totalDays: number
  top: number
  onClick?: () => void
}

export function ReleaseBar({ release, viewStart, totalDays, top, onClick }: ReleaseBarProps) {
  if (!release.startDate || !release.endDate) return null

  const { left, width } = getRangeBarStyle(release.startDate, release.endDate, viewStart, totalDays)
  const color = STATUS_COLOR[release.status] ?? STATUS_COLOR.planned
  const tooltip = `${release.version} — ${formatDateShort(release.startDate)} → ${formatDateShort(release.endDate)} (คลิกดูรายละเอียด)`

  return (
    <div className="absolute" style={{ left, width, top, height: 14 }}>
      <Tooltip content={tooltip} className="w-full h-full">
        <div
          onClick={onClick}
          className="w-full h-full rounded flex items-center overflow-hidden cursor-pointer select-none hover:opacity-100 transition-opacity"
          style={{ background: color, opacity: 0.85 }}
        >
          <span className="text-white text-[10px] font-semibold leading-none px-1 truncate">
            {release.version}
          </span>
        </div>
      </Tooltip>
    </div>
  )
}
