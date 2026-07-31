import Link from "next/link"
import { Flag } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { computePersonFocus, monthKey } from "@/lib/utils/workload"
import { formatDateShort } from "@/lib/utils/date"
import type { PersonWithMemberships, ProjectWithRelations } from "@/lib/types"

interface PersonCardProps {
  person: PersonWithMemberships
  projects: ProjectWithRelations[]
}

const PRIORITY_DOT: Record<string, string> = {
  high: "text-rag-red",
  medium: "text-rag-amber",
  low: "text-rag-green",
}

export function PersonCard({ person, projects }: PersonCardProps) {
  const focus = computePersonFocus(person, projects, monthKey(new Date()))
  const isBench = focus.totalHours === 0

  return (
    <div className="bg-card border border-border rounded-card p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={person.name} avatarUrl={person.avatarUrl} size="lg" />
          <div className="min-w-0">
            <h3 className="font-semibold text-text-primary truncate">{person.name}</h3>
            {person.department && <p className="text-xs text-text-muted">{person.department}</p>}
            {isBench && <p className="text-xs text-text-muted mt-0.5">ไม่มีชั่วโมงลงเดือนนี้ — ว่าง พร้อมรับงานใหม่</p>}
          </div>
        </div>
        <span
          className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
          style={{ background: focus.status.bg, color: focus.status.color }}
        >
          {focus.pct}%
        </span>
      </div>

      {!isBench && (
        <>
          {/* Working on now */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5">Working on now</p>
            <div className="flex flex-col gap-1">
              {focus.releases.slice(0, 2).map((r) => (
                <div key={r.releaseId} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-text-muted truncate">{r.projectName} · {r.version}</span>
                  <span className="font-medium text-text-primary shrink-0">{Math.round(r.hours)}h</span>
                </div>
              ))}
              {focus.releases.length > 2 && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-text-muted">+{focus.releases.length - 2} more release{focus.releases.length - 2 > 1 ? "s" : ""}</span>
                  <span className="font-medium text-text-primary shrink-0">
                    {Math.round(focus.releases.slice(2).reduce((s, r) => s + r.hours, 0))}h
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Next steps */}
          {focus.nextSteps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-1.5">Next steps</p>
              <div className="flex flex-col gap-1">
                {focus.nextSteps.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 text-xs">
                    <Flag size={10} className={`shrink-0 ${PRIORITY_DOT[s.priority] ?? "text-rag-amber"}`} fill="currentColor" />
                    <span className="flex-1 min-w-0 truncate text-text-primary">{s.description}</span>
                    <span className={`shrink-0 ${s.overdue ? "text-rag-red font-medium" : "text-text-muted"}`}>
                      {s.overdue ? "overdue" : formatDateShort(s.dueDate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Link
        href={`/people/${person.id}`}
        className="text-sm text-accent hover:underline font-medium mt-auto"
      >
        View Profile →
      </Link>
    </div>
  )
}
