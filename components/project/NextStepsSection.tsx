import { formatDateShort } from "@/lib/utils/date"
import type { NextStep } from "@/lib/types"

const PRIORITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)",   label: "P0" },
  medium: { bg: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)", label: "P1" },
  low:    { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)", label: "P2" },
}

interface NextStepsSectionProps {
  steps: NextStep[]
}

export function NextStepsSection({ steps }: NextStepsSectionProps) {
  if (steps.length === 0) {
    return <p className="text-sm text-text-muted italic">No next steps recorded.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {steps.map((s) => {
        const pr = PRIORITY_STYLE[(s as any).priority ?? "medium"]
        const effortDays = (s as any).effortDays as number | null | undefined
        return (
          <div key={s.id} className="flex items-start gap-3">
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${s.done ? "bg-rag-green border-rag-green" : "border-gray-300"}`} />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {!s.done && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: pr.bg, color: pr.color }}>
                    {pr.label}
                  </span>
                )}
                <p className={`text-sm ${s.done ? "line-through text-text-muted" : "text-text-primary"}`}>
                  {s.description}
                </p>
              </div>
              <p className="text-xs text-text-muted">
                Owner: {s.owner} · Due: {formatDateShort(s.dueDate)}
                {effortDays != null && <> · {effortDays}d effort</>}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
