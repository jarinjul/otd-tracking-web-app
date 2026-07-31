export interface TrendPoint {
  label: string
  value: number
}

const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
const fmtBahtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

interface SpendTrendChartProps {
  data: TrendPoint[]
  color?: string
  height?: number
}

export function SpendTrendChart({ data, color = "var(--color-accent)", height = 120 }: SpendTrendChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
          <span className="text-xs font-medium text-text-muted opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
            {fmtBaht(d.value)} ฿
          </span>
          <div
            className="w-full rounded-t transition-all"
            style={{
              height: `${Math.max(2, (d.value / max) * (height - 24))}px`,
              background: color,
              opacity: d.value > 0 ? 0.85 : 0.15,
            }}
            title={`${d.label}: ${fmtBaht(d.value)} ฿`}
          />
          <span className="text-xs text-text-muted shrink-0">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export { fmtBahtCompact }
