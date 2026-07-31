interface WeekSummaryCardsProps {
  total: number
  done: number
  pending: number
  carriedOver: number
}

function Card({ label, value, tone }: { label: string; value: string; tone: "red" | "amber" | "green" | "accent" | "neutral" }) {
  const toneMap: Record<string, { bg: string; color: string }> = {
    red:    { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)" },
    amber:  { bg: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)" },
    green:  { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)" },
    accent: { bg: "var(--color-accent-light)",    color: "var(--color-accent)" },
    neutral:{ bg: "var(--color-card)",             color: "var(--color-text-primary)" },
  }
  const t = toneMap[tone]
  return (
    <div
      className="flex-1 flex flex-col gap-1 px-5 py-4 rounded-card border-2"
      style={{ background: t.bg, borderColor: "transparent", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: t.color, opacity: 0.8 }}>{label}</span>
      <span className="text-3xl font-bold" style={{ color: t.color }}>{value}</span>
    </div>
  )
}

export function WeekSummaryCards({ total, done, pending, carriedOver }: WeekSummaryCardsProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex gap-4 px-6 py-4">
      <Card label="Plan Items" value={String(total)} tone="neutral" />
      <Card label="Done" value={`${done} (${pct}%)`} tone="green" />
      <Card label="Pending" value={String(pending)} tone={pending > 0 ? "accent" : "neutral"} />
      <Card label="Carried to Next Week" value={String(carriedOver)} tone={carriedOver > 0 ? "amber" : "neutral"} />
    </div>
  )
}
