import { formatDateShort } from "@/lib/utils/date"

export interface FocusTask {
  id: string
  description: string
  projectName: string
  dueDate: string
  priority: "high" | "medium" | "low"
  effortDays: number | null
  overdue: boolean
  dueThisWeek: boolean
}

export interface PersonFocus {
  owner: string
  tasks: FocusTask[]
  committedEffort: number
  capacityDays: number | null
  overloaded: boolean
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)",   label: "P0" },
  medium: { bg: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)", label: "P1" },
  low:    { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)", label: "P2" },
}

export function PersonFocusCard({ focus }: { focus: PersonFocus }) {
  const thisWeekTasks = focus.tasks.filter((t) => t.dueThisWeek)
  const laterTasks = focus.tasks.filter((t) => !t.dueThisWeek).slice(0, 3)

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "var(--color-card)",
        borderColor: focus.overloaded ? "var(--color-rag-red)" : "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{focus.owner}</span>
        <div className="flex items-center gap-2">
          {focus.capacityDays != null && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: focus.overloaded ? "var(--color-rag-red-light)" : "var(--color-surface)",
                color: focus.overloaded ? "var(--color-rag-red-text)" : "var(--color-text-muted)",
              }}
            >
              {focus.overloaded && "⚠ "}{focus.committedEffort}d / {focus.capacityDays}d capacity
            </span>
          )}
        </div>
      </div>

      {thisWeekTasks.length === 0 ? (
        <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ไม่มีงานที่ due สัปดาห์นี้</p>
      ) : (
        <div className="flex flex-col gap-2">
          {thisWeekTasks.map((t) => {
            const pr = PRIORITY_STYLE[t.priority]
            return (
              <div key={t.id} className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold shrink-0 mt-0.5" style={{ background: pr.bg, color: pr.color }}>
                  {pr.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>{t.description}</p>
                  <p className="text-xs" style={{ color: t.overdue ? "var(--color-rag-red-text)" : "var(--color-text-muted)" }}>
                    {t.projectName} · {t.overdue ? "⚠ Overdue" : `Due ${formatDateShort(t.dueDate)}`}
                    {t.effortDays != null && ` · ${t.effortDays}d`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {laterTasks.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>เร็วๆ นี้</p>
          <div className="flex flex-col gap-1">
            {laterTasks.map((t) => (
              <p key={t.id} className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                • {t.description} — {formatDateShort(t.dueDate)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
