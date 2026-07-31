import type { RagStatus } from "@/lib/types"

const CONFIG: Record<RagStatus, { label: string; dot: string; bg: string; text: string }> = {
  green: { label: "On Track", dot: "🟢", bg: "bg-rag-green-light", text: "text-rag-green-text" },
  amber: { label: "At Risk",  dot: "🟡", bg: "bg-rag-amber-light", text: "text-rag-amber-text" },
  red:   { label: "Critical", dot: "🔴", bg: "bg-rag-red-light",   text: "text-rag-red-text"   },
}

interface RAGBadgeProps {
  status: RagStatus
  showLabel?: boolean
  pulse?: boolean
  className?: string
}

export function RAGBadge({ status, showLabel = true, pulse = false, className = "" }: RAGBadgeProps) {
  const c = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-xs font-medium ${c.bg} ${c.text} ${pulse && status === "red" ? "rag-pulse" : ""} ${className}`}
    >
      <span>{c.dot}</span>
      {showLabel && <span>{c.label}</span>}
    </span>
  )
}
