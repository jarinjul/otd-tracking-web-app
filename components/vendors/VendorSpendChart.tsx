export interface VendorSpendSlice {
  vendorCode: string
  vendorName: string
  value: number
  percent: number
  color: string
}

function DonutChart({ data }: { data: VendorSpendSlice[] }) {
  const R = 72
  const cx = 100
  const cy = 100
  const circumference = 2 * Math.PI * R
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--color-text-muted)" }}>
        No spend data
      </div>
    )
  }

  let cumulative = 0
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const len = (d.value / total) * circumference
      const offset = cumulative
      cumulative += len
      return { ...d, len, offset }
    })

  const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <g transform="rotate(-90 100 100)">
        {segments.map((s) => (
          <circle
            key={s.vendorCode}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={26}
            strokeDasharray={`${s.len} ${circumference}`}
            strokeDashoffset={-s.offset}
          />
        ))}
      </g>
      <text x="100" y="93" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--color-text-primary)">
        {fmtBaht(total)}
      </text>
      <text x="100" y="112" textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
        ฿ Total Spend
      </text>
    </svg>
  )
}

function Legend({ data }: { data: VendorSpendSlice[] }) {
  const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })
  return (
    <div className="flex flex-col gap-2 mt-1">
      {data.map((d) => (
        <div key={d.vendorCode} className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
          <span className="truncate">{d.vendorName}</span>
          <span className="ml-auto font-medium tabular-nums shrink-0" style={{ color: "var(--color-text-primary)" }}>
            {fmtBaht(d.value)} ฿ <span style={{ color: "var(--color-text-muted)" }}>({d.percent}%)</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export function VendorSpendChart({ data }: { data: VendorSpendSlice[] }) {
  return (
    <div className="flex gap-5 items-center px-5 py-4">
      <div className="shrink-0" style={{ width: 150, height: 150 }}>
        <DonutChart data={data} />
      </div>
      <div className="flex-1 min-w-0">
        <Legend data={data} />
      </div>
    </div>
  )
}
