import type { Phase } from "@/lib/types"
import { PHASE_LABELS } from "@/lib/types"

interface PhaseBadgeProps {
  phase: Phase
  className?: string
}

export function PhaseBadge({ phase, className = "" }: PhaseBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium bg-accent-light text-accent ${className}`}
    >
      {PHASE_LABELS[phase]}
    </span>
  )
}
