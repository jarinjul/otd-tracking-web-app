import { formatDateShort } from "@/lib/utils/date"
import type { Blocker, Risk, Severity } from "@/lib/types"

const SEV_CONFIG: Record<Severity, { dot: string; bg: string; text: string; label: string }> = {
  high:   { dot: "🔴", bg: "bg-rag-red-light",   text: "text-rag-red-text",   label: "HIGH" },
  medium: { dot: "🟡", bg: "bg-rag-amber-light",  text: "text-rag-amber-text", label: "MED"  },
  low:    { dot: "🟢", bg: "bg-rag-green-light",  text: "text-rag-green-text", label: "LOW"  },
}

interface BlockersSectionProps {
  blockers: Blocker[]
  risks: Risk[]
}

export function BlockersSection({ blockers, risks }: BlockersSectionProps) {
  const sortedBlockers = [...blockers].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })

  return (
    <div className="flex flex-col gap-4">
      {sortedBlockers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Blockers</h4>
          <div className="flex flex-col gap-2">
            {sortedBlockers.map((b) => {
              const c = SEV_CONFIG[b.severity]
              return (
                <div key={b.id} className={`${c.bg} ${c.text} rounded-lg p-3`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium">{c.dot} [{c.label}] {b.description}</span>
                  </div>
                  <div className="text-xs opacity-80">
                    Owner: {b.owner}
                    {b.dueDate && <span> · Due: {formatDateShort(b.dueDate)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {risks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Risks</h4>
          <div className="flex flex-col gap-2">
            {risks.map((r) => {
              const c = SEV_CONFIG[r.impact]
              return (
                <div key={r.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-xs font-semibold shrink-0">{c.dot} Impact: {c.label}</span>
                    <span className="text-xs text-text-muted">Likelihood: {SEV_CONFIG[r.likelihood].label}</span>
                  </div>
                  <p className="text-sm text-text-primary mb-1">{r.description}</p>
                  {r.mitigation && (
                    <p className="text-xs text-text-muted">Mitigation: {r.mitigation}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {blockers.length === 0 && risks.length === 0 && (
        <p className="text-sm text-text-muted italic">No blockers or risks recorded.</p>
      )}
    </div>
  )
}
