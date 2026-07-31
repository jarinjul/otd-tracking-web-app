"use client"

import { useEffect, useState } from "react"

interface BucketData {
  bucket: string
  label: string
  color: string
  count: number
  percent: number
  rag: { green: number; amber: number; red: number }
}

function DonutChart({ data }: { data: BucketData[] }) {
  const R = 72
  const cx = 100
  const cy = 100
  const circumference = 2 * Math.PI * R
  const total = data.reduce((s, d) => s + d.count, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--color-text-muted)" }}>
        No projects
      </div>
    )
  }

  let cumulative = 0
  const segments = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const len = (d.count / total) * circumference
      const offset = cumulative
      cumulative += len
      return { ...d, len, offset }
    })

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <g transform="rotate(-90 100 100)">
        {segments.map((s) => (
          <circle
            key={s.bucket}
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
      {/* Center label */}
      <text
        x="100"
        y="93"
        textAnchor="middle"
        fontSize="30"
        fontWeight="700"
        fill="var(--color-text-primary)"
      >
        {total}
      </text>
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fontSize="10"
        fill="var(--color-text-muted)"
      >
        Projects
      </text>
    </svg>
  )
}

function Legend({ data }: { data: BucketData[] }) {
  const visible = data.filter((d) => d.count > 0)
  return (
    <div className="flex flex-col gap-1.5 mt-3">
      {visible.map((d) => (
        <div key={d.bucket} className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
          <span className="truncate">{d.label}</span>
          <span className="ml-auto font-medium tabular-nums" style={{ color: "var(--color-text-primary)" }}>{d.count}</span>
        </div>
      ))}
    </div>
  )
}

export function StrategicBucketsSection() {
  const [data, setData] = useState<BucketData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/strategic-buckets")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div
      className="mx-6 my-4 rounded-xl border"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          8 Strategic Buckets
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
          All Portfolio
        </span>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading…
        </div>
      ) : (
        <div className="flex gap-0">
          {/* Left 60% — donut + legend */}
          <div className="flex gap-4 items-center px-5 py-4" style={{ width: "60%" }}>
            <div className="shrink-0" style={{ width: 140, height: 140 }}>
              <DonutChart data={data} />
            </div>
            <div className="flex-1 min-w-0">
              <Legend data={data} />
            </div>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch" style={{ background: "var(--color-border)" }} />

          {/* Right 40% — summary table */}
          <div className="flex-1 overflow-auto py-4 px-4" style={{ width: "40%" }}>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--color-text-muted)" }}>
                  <th className="text-left pb-2 font-medium">Bucket</th>
                  <th className="text-center pb-2 font-medium w-10">N</th>
                  <th className="text-center pb-2 font-medium w-10">%</th>
                  <th className="text-center pb-2 font-medium w-7">🟢</th>
                  <th className="text-center pb-2 font-medium w-7">🟡</th>
                  <th className="text-center pb-2 font-medium w-7">🔴</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr
                    key={d.bucket}
                    style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="truncate" style={{ maxWidth: 140 }}>{d.label}</span>
                      </div>
                    </td>
                    <td className="text-center tabular-nums font-medium py-1.5" style={{ color: "var(--color-text-primary)" }}>
                      {d.count}
                    </td>
                    <td className="text-center tabular-nums py-1.5">
                      {d.percent > 0 ? `${d.percent}%` : "—"}
                    </td>
                    <td className="text-center tabular-nums py-1.5">{d.rag.green || "—"}</td>
                    <td className="text-center tabular-nums py-1.5">{d.rag.amber || "—"}</td>
                    <td className="text-center tabular-nums py-1.5">{d.rag.red || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
