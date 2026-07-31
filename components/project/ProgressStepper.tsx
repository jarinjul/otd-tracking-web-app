import { Check, Circle } from "lucide-react"
import { PHASE_ORDER, PHASE_LABELS, type Phase } from "@/lib/types"

interface ProgressStepperProps {
  currentPhase: Phase
}

export function ProgressStepper({ currentPhase }: ProgressStepperProps) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase)

  return (
    <div className="flex flex-col gap-0">
      {PHASE_ORDER.map((phase, idx) => {
        const done    = idx < currentIdx
        const active  = idx === currentIdx
        const future  = idx > currentIdx

        return (
          <div key={phase} className="flex items-start gap-3">
            {/* connector + icon column */}
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  done   ? "bg-rag-green text-white" :
                  active ? "bg-accent text-white ring-4 ring-accent/20" :
                           "bg-gray-100 text-text-muted"
                }`}
              >
                {done ? <Check size={12} /> : active ? "●" : <Circle size={10} className="opacity-40" />}
              </div>
              {idx < PHASE_ORDER.length - 1 && (
                <div className={`w-0.5 h-6 ${done ? "bg-rag-green" : "bg-gray-200"}`} />
              )}
            </div>

            {/* label */}
            <div className={`pt-0.5 pb-4 text-sm ${done ? "text-rag-green font-medium" : active ? "text-accent font-semibold" : "text-text-muted"}`}>
              {PHASE_LABELS[phase]}
              {active && <span className="ml-2 text-xs font-normal text-text-muted">(Current)</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
