"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { TARGET_RATIO, monthKey, workloadStatus } from "@/lib/utils/workload"

type ReleaseOpt = { id: string; version: string; status: string; startDate: Date | string | null; endDate: Date | string | null }
type ProjectOpt = { id: string; name: string; strategicBucket: string | null; releases: ReleaseOpt[] }
type PersonOpt = { id: string; name: string; avatarUrl: string | null; monthlyCapacityHours: number }
type EntryOpt = { releaseId: string; personId: string; month: Date | string; hours: number }

interface WorkloadClientProps {
  projects: ProjectOpt[]
  people: PersonOpt[]
  entries: EntryOpt[]
}

const STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  deployed: "Deployed",
  rolled_back: "Rolled Back",
}

const MAX_MONTHS = 24 // safety cap for pathologically long releases

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function toDate(d: Date | string | null): Date | null {
  if (!d) return null
  return typeof d === "string" ? new Date(d) : d
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

function releaseMonths(release: ReleaseOpt): string[] {
  const start = toDate(release.startDate)
  const end = toDate(release.endDate)
  if (!start || !end) {
    return [monthKey(new Date())]
  }
  const months: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last && months.length < MAX_MONTHS) {
    months.push(monthKey(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months.length > 0 ? months : [monthKey(new Date())]
}

function cellKey(releaseId: string, personId: string, month: string) {
  return `${releaseId}::${personId}::${month}`
}

const inputStyle = { borderColor: "var(--color-border)", background: "white", color: "var(--color-text-primary)" }

export function WorkloadClient({ projects, people, entries }: WorkloadClientProps) {
  const [hours, setHours] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const e of entries) map[cellKey(e.releaseId, e.personId, monthKey(toDate(e.month)!))] = e.hours
    return map
  })
  const [capacities, setCapacities] = useState<Record<string, number>>(() =>
    Object.fromEntries(people.map((p) => [p.id, p.monthlyCapacityHours]))
  )
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [openCell, setOpenCell] = useState<{ releaseId: string; personId: string } | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // Every month any release is active in — the footer's Workload % is scoped to one of these at a time,
  // since comparing a multi-month total against one month's Target Capacity was misleading.
  const allMonths = useMemo(() => {
    const set = new Set<string>()
    for (const project of projects) for (const r of project.releases) for (const m of releaseMonths(r)) set.add(m)
    return Array.from(set).sort()
  }, [projects])

  // The heatmap shows one year (all 12 months) at a time, defaulting to the current year, with
  // prev/next to browse other years — showing every year's months at once was too dense to read.
  const [heatmapYear, setHeatmapYear] = useState<number>(() => new Date().getFullYear())
  const heatmapMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${heatmapYear}-${String(i + 1).padStart(2, "0")}`),
    [heatmapYear]
  )

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const current = monthKey(new Date())
    return current
  })
  const effectiveMonth = allMonths.includes(selectedMonth) ? selectedMonth : (allMonths[0] ?? selectedMonth)

  useEffect(() => {
    if (!openCell) return
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Force the focused month input's onBlur (and its save) to run before we unmount the popover.
        ;(document.activeElement as HTMLElement | null)?.blur()
        setOpenCell(null)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [openCell])

  function toggleProject(projectId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  async function saveMonthCell(releaseId: string, personId: string, month: string, value: number) {
    await fetch("/api/workload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId, personId, month, hours: value }),
    })
  }

  function handleMonthChange(releaseId: string, personId: string, month: string, raw: string) {
    const value = raw === "" ? 0 : Number(raw)
    if (Number.isNaN(value)) return
    setHours((prev) => ({ ...prev, [cellKey(releaseId, personId, month)]: value }))
  }

  function handleMonthBlur(releaseId: string, personId: string, month: string) {
    saveMonthCell(releaseId, personId, month, hours[cellKey(releaseId, personId, month)] ?? 0)
  }

  async function handleCapacityBlur(personId: string) {
    await fetch(`/api/admin/people/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyCapacityHours: capacities[personId] ?? 0 }),
    })
  }

  // Total hours a release x person cell holds, summed across that release's months.
  function releasePersonTotal(release: ReleaseOpt, personId: string) {
    return releaseMonths(release).reduce((sum, m) => sum + (hours[cellKey(release.id, personId, m)] ?? 0), 0)
  }

  function projectSubtotal(project: ProjectOpt, personId: string) {
    return project.releases.reduce((sum, r) => sum + releasePersonTotal(r, personId), 0)
  }

  // Grand total per person across every release and every month, regardless of collapsed groups.
  // Used for the matrix cells and project subtotals — those stay lifetime totals.
  const totalsByPerson = useMemo(() => {
    const totals: Record<string, number> = Object.fromEntries(people.map((p) => [p.id, 0]))
    for (const [key, value] of Object.entries(hours)) {
      const personId = key.split("::")[1]
      if (personId in totals) totals[personId] += value
    }
    return totals
  }, [hours, people])

  // Hours per person for just the selected month — this is what the footer's Workload % compares
  // against Target Capacity, since Target Capacity is itself a per-month figure.
  const monthTotalsByPerson = useMemo(() => {
    const totals: Record<string, number> = Object.fromEntries(people.map((p) => [p.id, 0]))
    for (const [key, value] of Object.entries(hours)) {
      const [, personId, month] = key.split("::")
      if (month === effectiveMonth && personId in totals) totals[personId] += value
    }
    return totals
  }, [hours, people, effectiveMonth])

  // ── Team Workload Report (summary cards, per-person bars, forward heatmap) ──
  const releaseProjectMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const project of projects) for (const r of project.releases) map[r.id] = project.name
    return map
  }, [projects])

  // personId -> month -> total hours (all releases combined)
  const personMonthTotals = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const p of people) map[p.id] = {}
    for (const [key, value] of Object.entries(hours)) {
      const [, personId, month] = key.split("::")
      if (!map[personId]) continue
      map[personId][month] = (map[personId][month] ?? 0) + value
    }
    return map
  }, [hours, people])

  // personId -> month -> projectName -> hours
  const personMonthProjectBreakdown = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number>>> = {}
    for (const [key, value] of Object.entries(hours)) {
      if (value <= 0) continue
      const [releaseId, personId, month] = key.split("::")
      const projectName = releaseProjectMap[releaseId] ?? "Unknown"
      map[personId] ??= {}
      map[personId][month] ??= {}
      map[personId][month][projectName] = (map[personId][month][projectName] ?? 0) + value
    }
    return map
  }, [hours, releaseProjectMap])

  const reportRows = useMemo(() => {
    return people
      .map((p) => {
        const capacity = capacities[p.id] ?? 0
        const target = capacity * TARGET_RATIO
        const total = personMonthTotals[p.id]?.[effectiveMonth] ?? 0
        const pct = target > 0 ? Math.round((total / target) * 1000) / 10 : 0
        const barPct = capacity > 0 ? Math.min(100, Math.round((total / capacity) * 100)) : 0
        const breakdown = Object.entries(personMonthProjectBreakdown[p.id]?.[effectiveMonth] ?? {}).sort((a, b) => b[1] - a[1])
        return { person: p, total, target, pct, barPct, status: workloadStatus(pct), breakdown }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [people, capacities, personMonthTotals, effectiveMonth, personMonthProjectBreakdown])

  const avgPct = reportRows.length > 0 ? Math.round((reportRows.reduce((s, r) => s + r.pct, 0) / reportRows.length) * 10) / 10 : 0
  const overloadedCount = reportRows.filter((r) => r.pct > 110).length
  const underutilizedCount = reportRows.filter((r) => r.pct < 60).length
  const benchHours = Math.round(reportRows.reduce((s, r) => s + Math.max(0, r.target - r.total), 0))

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Workload</h1>
          <p className="text-sm text-text-muted mt-0.5">
            กรอกชั่วโมง/เดือน ที่แต่ละคนถูกจัดสรรให้แต่ละ Release — คลิกที่ชื่อ Project เพื่อดู Release ย่อย แล้วคลิกตัวเลขในช่องเพื่อกรอกชั่วโมงแยกรายเดือน
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <label className="text-xs font-medium text-text-muted">เดือนที่ใช้คำนวณ Workload %</label>
          <select
            value={effectiveMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border"
            style={inputStyle}
          >
            {allMonths.length === 0 && <option value={effectiveMonth}>{monthLabel(effectiveMonth)}</option>}
            {allMonths.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-8">
        {/* ── Team Workload Report ── */}
        <div className="rounded-xl border p-5 mb-6" style={{ borderColor: "var(--color-border)", background: "white" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
            Team Workload Report — {monthLabel(effectiveMonth)}
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="rounded-lg p-3" style={{ background: "var(--color-surface)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Team avg utilization</p>
              <p className="text-xl font-semibold" style={{ color: workloadStatus(avgPct).color }}>{avgPct}%</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "var(--color-surface)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Overloaded</p>
              <p className="text-xl font-semibold" style={{ color: "var(--color-rag-red-text)" }}>{overloadedCount} คน</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "var(--color-surface)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Underutilized</p>
              <p className="text-xl font-semibold" style={{ color: "var(--color-accent)" }}>{underutilizedCount} คน</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "var(--color-surface)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Bench capacity</p>
              <p className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{benchHours}h</p>
            </div>
          </div>

          {/* Utilization bars */}
          <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
            Utilization by person <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>— hover a bar to see which projects make up the hours</span>
          </p>
          <div className="flex flex-col gap-3 mb-6">
            {reportRows.map(({ person, total, pct, barPct, status, breakdown }) => (
              <div key={person.id} className="relative group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-2">
                    <Avatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                    <span style={{ color: "var(--color-text-primary)" }}>{person.name}</span>
                  </span>
                  <span className="font-semibold" style={{ color: status.color }}>{pct}% · {total}h</span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${barPct}%`, background: status.color }} />
                  <div className="absolute -top-0.5 -bottom-0.5" style={{ left: "80%", width: 2, background: "var(--color-text-primary)" }} />
                </div>

                {breakdown.length > 0 && (
                  <div
                    className="hidden group-hover:block absolute z-20 top-full mt-1.5 left-0 rounded-xl border p-3"
                    style={{ borderColor: "var(--color-border)", background: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 220 }}
                  >
                    <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>{person.name} · {monthLabel(effectiveMonth)} · {total}h</p>
                    <div className="flex flex-col gap-1.5">
                      {breakdown.map(([projectName, h]) => (
                        <div key={projectName} className="flex items-center justify-between text-xs">
                          <span style={{ color: "var(--color-text-muted)" }}>{projectName}</span>
                          <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{h}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Forward heatmap — one year at a time */}
          {allMonths.length > 1 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Workload Heatmap <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>— ช่วยดักโหลดเกินล่วงหน้า</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHeatmapYear((y) => y - 1)}
                    className="w-6 h-6 rounded-full text-xs flex items-center justify-center border"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                    aria-label="Previous year"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-semibold w-10 text-center" style={{ color: "var(--color-text-primary)" }}>{heatmapYear}</span>
                  <button
                    type="button"
                    onClick={() => setHeatmapYear((y) => y + 1)}
                    className="w-6 h-6 rounded-full text-xs flex items-center justify-center border"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                    aria-label="Next year"
                  >
                    ›
                  </button>
                  {heatmapYear !== new Date().getFullYear() && (
                    <button
                      type="button"
                      onClick={() => setHeatmapYear(new Date().getFullYear())}
                      className="text-xs px-2 py-0.5 rounded-lg border font-medium"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
                    >
                      This year
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <td className="pr-3 py-1" />
                      {heatmapMonths.map((m) => (
                        <td key={m} className="text-center px-1 py-1" style={{ color: "var(--color-text-muted)", minWidth: 34 }}>{monthLabel(m).split(" ")[0]}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.id}>
                        <td className="pr-3 py-0.5 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{p.name}</td>
                        {heatmapMonths.map((m) => {
                          const total = personMonthTotals[p.id]?.[m] ?? 0
                          const target = (capacities[p.id] ?? 0) * TARGET_RATIO
                          const pct = target > 0 ? Math.round((total / target) * 1000) / 10 : 0
                          const st = total > 0 ? workloadStatus(pct) : null
                          const breakdown = Object.entries(personMonthProjectBreakdown[p.id]?.[m] ?? {}).sort((a, b) => b[1] - a[1])
                          return (
                            <td key={m} className="p-0.5 relative group">
                              <div
                                className="rounded"
                                style={{ height: 18, background: st ? st.color : "var(--color-surface)", opacity: st ? 1 : 1 }}
                                title={total > 0 ? `${p.name} · ${monthLabel(m)} · ${total}h (${pct}%)` : undefined}
                              />
                              {breakdown.length > 0 && (
                                <div
                                  className="hidden group-hover:block absolute z-20 top-full mt-1 left-0 rounded-xl border p-2.5"
                                  style={{ borderColor: "var(--color-border)", background: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 200 }}
                                >
                                  <p className="text-xs mb-1.5" style={{ color: "var(--color-text-muted)" }}>{p.name} · {monthLabel(m)} · {total}h</p>
                                  <div className="flex flex-col gap-1">
                                    {breakdown.map(([projectName, h]) => (
                                      <div key={projectName} className="flex items-center justify-between text-xs">
                                        <span style={{ color: "var(--color-text-muted)" }}>{projectName}</span>
                                        <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{h}h</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--color-accent)" }} /> &lt;60%</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--color-rag-green)" }} /> ≤100%</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--color-rag-amber)" }} /> 100–110%</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--color-rag-red)" }} /> &gt;110%</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} /> No data</span>
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--color-border)", background: "white" }}>
          <table className="text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap sticky left-0"
                  style={{ color: "var(--color-text-muted)", background: "var(--color-surface)", minWidth: 280 }}
                >
                  Release
                </th>
                {people.map((p) => (
                  <th key={p.id} className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-text-muted)", minWidth: 110 }}>
                    <div className="flex flex-col items-center gap-1">
                      <Avatar name={p.name} avatarUrl={p.avatarUrl} size="sm" />
                      <span className="max-w-[100px] truncate">{p.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {projects.map((project) => {
                const isExpanded = expanded.has(project.id)
                return (
                  <Fragment key={project.id}>
                    <tr
                      onClick={() => toggleProject(project.id)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface)" }}
                    >
                      <td
                        className="px-4 py-2.5 font-semibold whitespace-nowrap sticky left-0"
                        style={{ color: "var(--color-text-primary)", background: "var(--color-surface)" }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span style={{ display: "inline-block", transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                          {project.name}
                          <span className="px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>
                            {project.releases.length} release{project.releases.length !== 1 ? "s" : ""}
                          </span>
                        </span>
                      </td>
                      {people.map((p) => {
                        const subtotal = projectSubtotal(project, p.id)
                        return (
                          <td key={p.id} className="px-3 py-2.5 text-center text-xs tabular-nums font-medium" style={{ color: subtotal > 0 ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                            {subtotal > 0 ? `${subtotal}h` : "—"}
                          </td>
                        )
                      })}
                    </tr>

                    {isExpanded && project.releases.length === 0 && (
                      <tr style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td className="pl-9 pr-4 py-2.5 text-xs italic sticky left-0" style={{ color: "var(--color-text-muted)", background: "white" }}>
                          No releases yet
                        </td>
                        {people.map((p) => <td key={p.id} />)}
                      </tr>
                    )}

                    {isExpanded && project.releases.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td className="pl-9 pr-4 py-2 text-xs whitespace-nowrap sticky left-0" style={{ background: "white" }}>
                          <span className="font-semibold" style={{ color: "var(--color-accent)" }}>{r.version}</span>
                          <span className="ml-2" style={{ color: "var(--color-text-muted)" }}>{STATUS_LABEL[r.status] ?? r.status}</span>
                        </td>
                        {people.map((p) => {
                          const total = releasePersonTotal(r, p.id)
                          const isOpen = openCell?.releaseId === r.id && openCell?.personId === p.id
                          return (
                            <td key={p.id} className="px-2 py-1.5 text-center relative">
                              <button
                                type="button"
                                onClick={() => setOpenCell(isOpen ? null : { releaseId: r.id, personId: p.id })}
                                className="w-16 px-1.5 py-1 text-center text-xs rounded border"
                                style={
                                  total > 0
                                    ? { borderColor: "var(--color-accent)", background: "var(--color-accent-light)", color: "var(--color-accent)", fontWeight: 600 }
                                    : { ...inputStyle, color: "var(--color-text-muted)" }
                                }
                              >
                                {total > 0 ? `${total}h` : "—"}
                              </button>

                              {isOpen && (
                                <div
                                  ref={popoverRef}
                                  className="absolute z-20 top-full mt-1.5 rounded-xl border p-3 text-left"
                                  style={{ borderColor: "var(--color-border)", background: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 260, left: "50%", transform: "translateX(-50%)" }}
                                >
                                  <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
                                    {p.name} · {r.version}
                                  </p>
                                  {(!r.startDate || !r.endDate) && (
                                    <p className="text-xs mb-2 italic" style={{ color: "var(--color-text-muted)" }}>
                                      Release ยังไม่ตั้ง Start/End Date — แสดงเดือนปัจจุบันชั่วคราว
                                    </p>
                                  )}
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {releaseMonths(r).map((m) => (
                                      <div key={m}>
                                        <label className="text-xs block mb-0.5" style={{ color: "var(--color-text-muted)" }}>{monthLabel(m)}</label>
                                        <input
                                          type="number"
                                          min={0}
                                          step={1}
                                          value={hours[cellKey(r.id, p.id, m)] ?? ""}
                                          onChange={(e) => handleMonthChange(r.id, p.id, m, e.target.value)}
                                          onBlur={() => handleMonthBlur(r.id, p.id, m)}
                                          placeholder="0"
                                          className="w-full px-1.5 py-1 text-center text-xs rounded border outline-none focus:ring-2"
                                          style={inputStyle}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total</span>
                                    <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{total}h</span>
                                  </div>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>

            <tfoot>
              <tr style={{ borderTop: "2px solid var(--color-border)", background: "var(--color-surface)" }}>
                <td className="px-4 py-2 text-xs font-semibold sticky left-0" style={{ color: "var(--color-text-primary)", background: "var(--color-surface)" }}>
                  Capacity (hrs/mo)
                </td>
                {people.map((p) => (
                  <td key={p.id} className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={capacities[p.id] ?? 0}
                      onChange={(e) => setCapacities((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 0 }))}
                      onBlur={() => handleCapacityBlur(p.id)}
                      className="w-16 px-1.5 py-1 text-center text-xs rounded border outline-none focus:ring-2"
                      style={inputStyle}
                    />
                  </td>
                ))}
              </tr>
              <tr style={{ borderTop: "1px solid var(--color-border)" }}>
                <td className="px-4 py-2 text-xs font-semibold sticky left-0" style={{ color: "var(--color-text-primary)", background: "white" }}>
                  Total Hours ({monthLabel(effectiveMonth)})
                </td>
                {people.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-center text-xs font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                    {monthTotalsByPerson[p.id] ?? 0}h
                  </td>
                ))}
              </tr>
              <tr style={{ borderTop: "1px solid var(--color-border)" }}>
                <td className="px-4 py-2 text-xs sticky left-0" style={{ color: "var(--color-text-muted)", background: "white" }}>
                  Target Capacity ({Math.round(TARGET_RATIO * 100)}%)
                </td>
                {people.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-center text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {Math.round((capacities[p.id] ?? 0) * TARGET_RATIO)}h
                  </td>
                ))}
              </tr>
              <tr style={{ borderTop: "1px solid var(--color-border)" }}>
                <td className="px-4 py-2.5 text-xs font-semibold sticky left-0" style={{ color: "var(--color-text-primary)", background: "white" }}>
                  Project Workload % ({monthLabel(effectiveMonth)})
                </td>
                {people.map((p) => {
                  const target = (capacities[p.id] ?? 0) * TARGET_RATIO
                  const total = monthTotalsByPerson[p.id] ?? 0
                  const pct = target > 0 ? Math.round((total / target) * 1000) / 10 : 0
                  const st = workloadStatus(pct)
                  return (
                    <td key={p.id} className="px-2 py-2.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: st.bg, color: st.color }} title={st.label}>
                        {pct}%
                      </span>
                    </td>
                  )
                })}
              </tr>
              <tr style={{ borderTop: "1px solid var(--color-border)" }}>
                <td className="px-4 py-2 text-xs italic sticky left-0" style={{ color: "var(--color-text-muted)", background: "white" }}>
                  Total Hours (all months)
                </td>
                {people.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-center text-xs tabular-nums italic" style={{ color: "var(--color-text-muted)" }}>
                    {totalsByPerson[p.id] ?? 0}h
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-accent)" }} /> &lt;60% Underutilized
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-rag-green)" }} /> ≤100% On Track
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-rag-amber)" }} /> 100–110% Warning
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-rag-red)" }} /> &gt;110% Overload
          </span>
        </div>
      </div>
    </div>
  )
}
