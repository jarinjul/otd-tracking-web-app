"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { monthKey } from "@/lib/utils/workload"
import { toDateParam } from "@/lib/utils/date"

type PersonOpt = { id: string; name: string; monthlyCapacityHours: number }
type ProjectOpt = { id: string; name: string }
type EntryOpt = {
  id: string
  date: Date | string
  hours: number
  source: string
  note: string | null
  person: { id: string; name: string }
  project: { id: string; name: string } | null
}

interface InterruptsClientProps {
  people: PersonOpt[]
  projects: ProjectOpt[]
  entries: EntryOpt[]
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}

const inputStyle = { borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-text-primary)" }

export function InterruptsClient({ people, projects, entries: initialEntries }: InterruptsClientProps) {
  const [entries, setEntries] = useState<EntryOpt[]>(initialEntries)
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()))

  const [date, setDate] = useState(() => toDateParam(new Date()))
  const [personId, setPersonId] = useState(people[0]?.id ?? "")
  const [hours, setHours] = useState("")
  const [source, setSource] = useState("")
  const [projectId, setProjectId] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const monthEntries = useMemo(
    () => entries.filter((e) => monthKey(e.date) === selectedMonth).sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [entries, selectedMonth]
  )

  const totalHours = useMemo(() => monthEntries.reduce((s, e) => s + e.hours, 0), [monthEntries])
  const teamCapacity = useMemo(() => people.reduce((s, p) => s + p.monthlyCapacityHours, 0), [people])
  const pctOfCapacity = teamCapacity > 0 ? Math.round((totalHours / teamCapacity) * 1000) / 10 : 0

  const bySource = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of monthEntries) map.set(e.source, (map.get(e.source) ?? 0) + e.hours)
    return Array.from(map.entries())
      .map(([source, hours]) => ({ source, hours }))
      .sort((a, b) => b.hours - a.hours)
  }, [monthEntries])

  const topSource = bySource[0]?.source ?? "—"
  const maxSourceHours = bySource[0]?.hours ?? 0
  const knownSources = useMemo(() => Array.from(new Set(entries.map((e) => e.source))).sort(), [entries])

  async function handleAdd() {
    const hoursNum = Number(hours)
    if (!date || !personId || !source.trim() || Number.isNaN(hoursNum) || hoursNum <= 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/interrupts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, personId, hours: hoursNum, source: source.trim(), projectId: projectId || null, note: note || null }),
      })
      if (res.ok) {
        const created = await res.json()
        setEntries((prev) => [created, ...prev])
        setHours("")
        setSource("")
        setProjectId("")
        setNote("")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    await fetch(`/api/interrupts/${id}`, { method: "DELETE" })
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Interrupts</h1>
        <p className="text-text-muted mt-1">งานแทรก / งานเฉพาะหน้าที่ไม่ได้อยู่ในแผน — บันทึกแทนกระดาษ</p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => setSelectedMonth((m) => addMonths(m, -1))}
          className="p-1.5 rounded-lg border hover:bg-gray-50"
          style={inputStyle}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-text-primary w-24 text-center">{monthLabel(selectedMonth)}</span>
        <button
          type="button"
          onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded-lg border hover:bg-gray-50"
          style={inputStyle}
        >
          <ChevronRight size={16} />
        </button>
        {selectedMonth !== monthKey(new Date()) && (
          <button
            type="button"
            onClick={() => setSelectedMonth(monthKey(new Date()))}
            className="text-xs font-medium text-accent hover:underline"
          >
            This month
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-xs text-text-muted mb-1">ชั่วโมงแทรกรวม</p>
          <p className="text-2xl font-bold text-text-primary">{totalHours}h</p>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-xs text-text-muted mb-1">% ของ Capacity ทีม</p>
          <p className="text-2xl font-bold" style={{ color: pctOfCapacity > 15 ? "var(--color-rag-red-text)" : "var(--color-text-primary)" }}>
            {pctOfCapacity}%
          </p>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-xs text-text-muted mb-1">จำนวนครั้ง</p>
          <p className="text-2xl font-bold text-text-primary">{monthEntries.length}</p>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-xs text-text-muted mb-1">แหล่งที่มา Top</p>
          <p className="text-lg font-bold text-text-primary truncate" title={topSource}>{topSource}</p>
        </div>
      </div>

      {bySource.length > 0 && (
        <div className="rounded-card border border-border bg-card p-4 mb-6">
          <p className="text-sm font-semibold text-text-primary mb-3">Breakdown by source</p>
          <div className="flex flex-col gap-2">
            {bySource.map(({ source: s, hours: h }) => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-xs text-text-muted w-40 truncate shrink-0" title={s}>{s}</span>
                <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${maxSourceHours > 0 ? (h / maxSourceHours) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-text-primary w-12 text-right shrink-0">{h}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-card border border-border bg-card p-4 mb-6">
        <p className="text-sm font-semibold text-text-primary mb-3">เพิ่มงานแทรก</p>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 py-1.5 text-sm rounded-lg border" style={inputStyle} />
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="px-2 py-1.5 text-sm rounded-lg border" style={inputStyle}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            type="number" min={0} step={0.5} placeholder="ชั่วโมง" value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border" style={inputStyle}
          />
          <input
            list="interrupt-sources" placeholder="มาจากใคร (PO / หน่วยงาน)" value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border" style={inputStyle}
          />
          <datalist id="interrupt-sources">
            {knownSources.map((s) => <option key={s} value={s} />)}
          </datalist>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="px-2 py-1.5 text-sm rounded-lg border" style={inputStyle}>
            <option value="">ไม่ระบุ app</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            type="button" onClick={handleAdd} disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}
          >
            + Add
          </button>
        </div>
        <input
          placeholder="โน้ตสั้น (optional)" value={note} onChange={(e) => setNote(e.target.value)}
          className="mt-2 w-full px-2 py-1.5 text-sm rounded-lg border" style={inputStyle}
        />
      </div>

      <div className="rounded-card border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <th className="text-left px-4 py-2 font-medium text-text-muted">วันที่</th>
              <th className="text-left px-4 py-2 font-medium text-text-muted">คน</th>
              <th className="text-right px-4 py-2 font-medium text-text-muted">ชั่วโมง</th>
              <th className="text-left px-4 py-2 font-medium text-text-muted">มาจาก</th>
              <th className="text-left px-4 py-2 font-medium text-text-muted">App</th>
              <th className="text-left px-4 py-2 font-medium text-text-muted">โน้ต</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {monthEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-text-muted text-sm">ไม่มีงานแทรกในเดือนนี้</td>
              </tr>
            )}
            {monthEntries.map((e) => (
              <tr key={e.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-2 text-text-primary">{toDateParam(new Date(e.date))}</td>
                <td className="px-4 py-2 text-text-primary">{e.person.name}</td>
                <td className="px-4 py-2 text-right text-text-primary font-medium">{e.hours}h</td>
                <td className="px-4 py-2 text-text-primary">{e.source}</td>
                <td className="px-4 py-2 text-text-muted">{e.project?.name ?? "—"}</td>
                <td className="px-4 py-2 text-text-muted">{e.note ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => handleDelete(e.id)} className="text-text-muted hover:text-rag-red-text">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
