interface WorkloadBarProps {
  totalAllocation: number
  activeProjects: number
}

export function WorkloadBar({ totalAllocation, activeProjects }: WorkloadBarProps) {
  const overloaded = totalAllocation > 100
  const clamped = Math.min(150, totalAllocation)
  const fillPct = (clamped / 150) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">Active Projects: <strong className="text-text-primary">{activeProjects}</strong></span>
          <span className="text-sm text-text-muted">Total Allocation: <strong className={overloaded ? "text-overload" : "text-text-primary"}>{totalAllocation}%</strong></span>
        </div>
        {overloaded && (
          <span className="text-xs font-semibold text-white bg-overload px-2 py-1 rounded-badge">
            ⚠ Overloaded
          </span>
        )}
      </div>
      <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${overloaded ? "bg-overload" : "bg-rag-green"}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  )
}
