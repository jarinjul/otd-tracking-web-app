import { BUCKET_LABELS } from "@/lib/types"

const BUCKET_COLORS: Record<string, string> = {
  FOCUS:       "bg-accent-light text-accent",
  NEW_PRODUCT: "bg-rag-green-light text-rag-green-text",
  REVAMP:      "bg-rag-amber-light text-rag-amber-text",
  EXIT:        "bg-rag-red-light text-rag-red-text",
  INFRA:       "bg-purple-100 text-purple-700",
  KTLO:        "bg-gray-100 text-gray-600",
  RND:         "bg-cyan-100 text-cyan-700",
  COMPLIANCE:  "bg-orange-100 text-orange-700",
}

interface PortfolioBadgeProps {
  bucket: string | null | undefined
  className?: string
}

export function PortfolioBadge({ bucket, className = "" }: PortfolioBadgeProps) {
  if (!bucket) return null
  const colorCls = BUCKET_COLORS[bucket] ?? "bg-gray-100 text-gray-600"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium ${colorCls} ${className}`}>
      {BUCKET_LABELS[bucket] ?? bucket}
    </span>
  )
}
