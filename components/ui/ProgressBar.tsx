interface ProgressBarProps {
  value: number
  colorClass?: string
  className?: string
}

export function ProgressBar({ value, colorClass = "bg-accent", className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={`w-full h-2 rounded-full bg-gray-200 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${colorClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
