export interface ProjectHealthRow {
  id: string
  name: string
  strategicBucket: string | null
  version: string | null
  ragStatus: string | null
  phase: string | null
  progressPercent: number | null
  isDelayed: boolean
  delayDays: number | null
  needsDecision: boolean
}

const RAG_DOT: Record<string, string> = {
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
}

export function ProjectHealthTable({ rows }: { rows: ProjectHealthRow[] }) {
  // Sort: red first, then amber, then delayed/decision flagged, then rest
  const sorted = [...rows].sort((a, b) => {
    const rank = (r: ProjectHealthRow) => {
      if (r.ragStatus === "red") return 0
      if (r.isDelayed || r.needsDecision) return 1
      if (r.ragStatus === "amber") return 2
      return 3
    }
    return rank(a) - rank(b)
  })

  return (
    <div className="rounded-xl border h-full flex flex-col" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Project Health</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {sorted.map((r) => (
          <div key={r.id} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--color-surface)", marginBottom: 6 }}>
            <div className="flex items-center gap-2 mb-1">
              {r.ragStatus && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: RAG_DOT[r.ragStatus] ?? "#9CA3AF" }} />
              )}
              <span className="text-xs font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{r.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: "var(--color-text-muted)" }}>
              {r.version && <span>{r.version}</span>}
              {r.phase && <span>· {r.phase}</span>}
              {r.progressPercent != null && <span>· {r.progressPercent}%</span>}
            </div>
            {(r.isDelayed || r.needsDecision) && (
              <div className="flex items-center gap-1.5 mt-1">
                {r.isDelayed && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--color-rag-red-light)", color: "var(--color-rag-red-text)" }}>
                    ⏱ {r.delayDays != null ? `${r.delayDays}d late` : "Delayed"}
                  </span>
                )}
                {r.needsDecision && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)" }}>
                    ⚠ Decision
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
