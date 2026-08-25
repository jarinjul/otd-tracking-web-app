"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"

type ReleaseOpt = { id: string; version: string; startDate: Date | string | null; endDate: Date | string | null }
type ProjectOpt = { id: string; name: string; releases: ReleaseOpt[] }
type PersonOpt = { id: string; name: string }

interface AssignDialogProps {
  open: boolean
  onClose: () => void
  people: PersonOpt[]
  projects: ProjectOpt[]
  monthOptions: string[]
  monthLabel: (key: string) => string
  defaultPersonId?: string
  lockPerson?: boolean
  defaultReleaseId?: string
  lockRelease?: boolean
  defaultMonth: string
  onSubmit: (params: { releaseId: string; personId: string; month: string; hours: number }) => Promise<boolean>
}

const inputStyle = { borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-text-primary)" }

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d
}

function findProjectIdForRelease(projects: ProjectOpt[], releaseId: string): string {
  for (const p of projects) if (p.releases.some((r) => r.id === releaseId)) return p.id
  return ""
}

// Shared by both entry points (side panel "+ Assign" and the Capacity Outlook "unassigned release"
// flag) — person is locked when opened from an already-open person panel, release+project are
// locked when opened from a specific release's flag, per docs/RESOURCE-PLANNING.md Phase 2.
export function AssignDialog({
  open,
  onClose,
  people,
  projects,
  monthOptions,
  monthLabel,
  defaultPersonId,
  lockPerson,
  defaultReleaseId,
  lockRelease,
  defaultMonth,
  onSubmit,
}: AssignDialogProps) {
  const [personId, setPersonId] = useState(defaultPersonId ?? people[0]?.id ?? "")
  const [projectId, setProjectId] = useState(() => (defaultReleaseId ? findProjectIdForRelease(projects, defaultReleaseId) : projects[0]?.id ?? ""))
  const [releaseId, setReleaseId] = useState(defaultReleaseId ?? "")
  const [month, setMonth] = useState(defaultMonth)
  const [hours, setHours] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPersonId(defaultPersonId ?? people[0]?.id ?? "")
    setProjectId(defaultReleaseId ? findProjectIdForRelease(projects, defaultReleaseId) : projects[0]?.id ?? "")
    setReleaseId(defaultReleaseId ?? "")
    setMonth(defaultMonth)
    setHours("")
    setError(null)
    // Only re-sync when the dialog is (re)opened with new defaults, not on every projects/people ref change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultPersonId, defaultReleaseId, defaultMonth])

  const currentProject = projects.find((p) => p.id === projectId)

  // Releases active in the selected month sort first, per spec — "เสนอ release ที่ active ช่วงเดือนนั้นก่อน".
  const releaseOptions = useMemo(() => {
    if (!currentProject) return []
    const [y, m] = month.split("-").map(Number)
    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 0)
    const scored = currentProject.releases.map((r) => {
      const start = r.startDate ? toDate(r.startDate) : null
      const end = r.endDate ? toDate(r.endDate) : null
      const active = (!start || start <= monthEnd) && (!end || end >= monthStart)
      return { ...r, active }
    })
    scored.sort((a, b) => (a.active === b.active ? a.version.localeCompare(b.version) : a.active ? -1 : 1))
    return scored
  }, [currentProject, month])

  useEffect(() => {
    if (lockRelease) return
    if (!releaseOptions.some((r) => r.id === releaseId)) setReleaseId(releaseOptions[0]?.id ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseOptions, lockRelease])

  if (!open) return null

  const hoursNum = Number(hours)
  const canSubmit = !!personId && !!releaseId && !!month && hours !== "" && !Number.isNaN(hoursNum) && hoursNum > 0

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    const ok = await onSubmit({ releaseId, personId, month, hours: hoursNum })
    setSubmitting(false)
    if (ok) onClose()
    else setError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง")
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-[380px] rounded-xl border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>+ Assign</p>
          <button type="button" onClick={onClose} className="p-1 rounded" style={{ color: "var(--color-text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>คน</label>
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} disabled={lockPerson} className="w-full px-2 py-1.5 text-sm rounded-lg border disabled:opacity-60" style={inputStyle}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>โปรเจกต์</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={lockRelease} className="w-full px-2 py-1.5 text-sm rounded-lg border disabled:opacity-60" style={inputStyle}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Release</label>
            <select value={releaseId} onChange={(e) => setReleaseId(e.target.value)} disabled={lockRelease} className="w-full px-2 py-1.5 text-sm rounded-lg border disabled:opacity-60" style={inputStyle}>
              {releaseOptions.length === 0 && <option value="">ไม่มี release</option>}
              {releaseOptions.map((r) => (
                <option key={r.id} value={r.id}>{r.version}{r.active ? "" : " (ไม่ active เดือนนี้)"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>เดือน</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-2 py-1.5 text-sm rounded-lg border" style={inputStyle}>
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>ชั่วโมง</label>
            <input type="number" min={1} step={1} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="เช่น 40" className="w-full px-2 py-1.5 text-sm rounded-lg border" style={inputStyle} />
          </div>

          {error && <p className="text-xs" style={{ color: "var(--color-rag-red-text)" }}>{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="mt-1 px-3 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}
          >
            {submitting ? "กำลังบันทึก..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  )
}
