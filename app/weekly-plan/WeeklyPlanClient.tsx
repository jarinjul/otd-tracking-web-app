"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { weekStart as computeWeekStart, addDays, formatDate, toDateParam } from "@/lib/utils/date"
import { WeekNav } from "@/components/weekly-plan/WeekNav"
import { WeekSummaryCards } from "@/components/weekly-plan/WeekSummaryCards"
import { EditablePlanItems, type PlanItem, type PlanItemStatus } from "@/components/weekly-plan/EditablePlanItems"
import { PersonFocusCard, type PersonFocus, type FocusTask } from "@/components/weekly-plan/PersonFocusCard"
import { ProjectHealthTable, type ProjectHealthRow } from "@/components/weekly-plan/ProjectHealthTable"

type Priority = "high" | "medium" | "low"

interface RawRelease {
  id: string
  version: string
  status: string
  ragStatus: string
  phase: string
  progressPercent: number
  isDelayed: boolean
  delayDays: number | null
  needsDecision: boolean
  decisionNote: string | null
  startDate: string | null
  endDate: string | null
  releaseDate: string | null
}
interface RawProject {
  id: string
  name: string
  strategicBucket: string | null
  releases: RawRelease[]
}
interface RawNextStep {
  id: string
  description: string
  owner: string
  dueDate: string
  priority: Priority
  effortDays: number | null
  projectId: string
  project: { id: string; name: string }
}
interface RawPerson {
  id: string
  name: string
  memberships: { allocationPercent: number | null; startDate: string; endDate: string | null }[]
}
interface RawInterrupt {
  id: string
  date: string
  hours: number
  source: string
  person: { name: string }
}

interface WeeklyPlanClientProps {
  projects: RawProject[]
  nextSteps: RawNextStep[]
  people: RawPerson[]
  interrupts: RawInterrupt[]
}

const PRIORITY_SCORE: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

function pickActiveRelease(releases: RawRelease[]): RawRelease | null {
  if (releases.length === 0) return null
  const rank = (r: RawRelease) => (r.status === "in_progress" ? 0 : r.status === "planned" ? 1 : r.status === "deployed" ? 2 : 3)
  return [...releases].sort((a, b) => {
    const rd = rank(a) - rank(b)
    if (rd !== 0) return rd
    const at = a.startDate ? new Date(a.startDate).getTime() : 0
    const bt = b.startDate ? new Date(b.startDate).getTime() : 0
    return bt - at
  })[0]
}

export function WeeklyPlanClient({ projects, nextSteps, people, interrupts }: WeeklyPlanClientProps) {
  const today = useMemo(() => new Date(), [])
  const currentWeekStart = useMemo(() => computeWeekStart(today), [today])
  const [selectedWeekStart, setSelectedWeekStart] = useState(currentWeekStart)
  const selectedWeekEnd = useMemo(() => addDays(selectedWeekStart, 6), [selectedWeekStart])
  const isCurrentWeek = selectedWeekStart.getTime() === currentWeekStart.getTime()

  const [items, setItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [weekPlanId, setWeekPlanId] = useState<string | null>(null)

  const loadPlan = useCallback(async (weekDate: Date) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weekly-plan?week=${toDateParam(weekDate)}`)
      const plan = await res.json()
      setWeekPlanId(plan.id)
      setItems(plan.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlan(selectedWeekStart) }, [selectedWeekStart, loadPlan])

  async function handleUpdate(id: string, patch: Partial<Pick<PlanItem, "title" | "subtitle" | "note" | "status">>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    await fetch(`/api/weekly-plan/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await fetch(`/api/weekly-plan/items/${id}`, { method: "DELETE" })
  }

  async function handleAdd(data: { title: string; subtitle: string; note: string; projectName: string; owner: string }) {
    if (!weekPlanId) return
    const res = await fetch("/api/weekly-plan/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekPlanId, ...data }),
    })
    const created = await res.json()
    setItems((prev) => [...prev, created])
  }

  async function handleChecklistAdd(planItemId: string, text: string) {
    const res = await fetch("/api/weekly-plan/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planItemId, text }),
    })
    const created = await res.json()
    setItems((prev) => prev.map((i) => (i.id === planItemId ? { ...i, checklist: [...i.checklist, created] } : i)))
  }

  function handleChecklistToggle(planItemId: string, checklistId: string, done: boolean) {
    setItems((prev) => prev.map((i) => (
      i.id === planItemId
        ? { ...i, checklist: i.checklist.map((c) => (c.id === checklistId ? { ...c, done } : c)) }
        : i
    )))
    fetch(`/api/weekly-plan/checklist/${checklistId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    })
  }

  function handleChecklistDelete(planItemId: string, checklistId: string) {
    setItems((prev) => prev.map((i) => (
      i.id === planItemId
        ? { ...i, checklist: i.checklist.filter((c) => c.id !== checklistId) }
        : i
    )))
    fetch(`/api/weekly-plan/checklist/${checklistId}`, { method: "DELETE" })
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/weekly-plan/sync?week=${toDateParam(selectedWeekStart)}`, { method: "POST" })
      const plan = await res.json()
      setItems(plan.items ?? [])
    } finally {
      setSyncing(false)
    }
  }

  const done = items.filter((i) => i.status === "done").length
  const carriedOver = items.filter((i) => i.status === "carried_over").length
  const pending = items.length - done - carriedOver

  // ── Live "Weekly Focus by Person" — always reflects current data ──
  const isThisWeekOrOverdue = (dateStr: string) => new Date(dateStr) <= selectedWeekEnd

  const personFocus: PersonFocus[] = useMemo(() => {
    const byOwner = new Map<string, RawNextStep[]>()
    for (const s of nextSteps) {
      const key = s.owner.trim()
      if (!byOwner.has(key)) byOwner.set(key, [])
      byOwner.get(key)!.push(s)
    }

    const capacityByName = new Map<string, number>()
    for (const person of people) {
      const activePercent = person.memberships
        .filter((m) => {
          const started = new Date(m.startDate) <= selectedWeekEnd
          const notEnded = !m.endDate || new Date(m.endDate) >= selectedWeekStart
          return started && notEnded
        })
        .reduce((sum, m) => sum + (m.allocationPercent ?? 100), 0)
      if (activePercent > 0) capacityByName.set(person.name.trim().toLowerCase(), (5 * activePercent) / 100)
    }

    const focuses: PersonFocus[] = []
    for (const [owner, steps] of byOwner) {
      const sorted = [...steps].sort((a, b) => {
        const aOverdue = new Date(a.dueDate) < today
        const bOverdue = new Date(b.dueDate) < today
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
        const pd = PRIORITY_SCORE[a.priority ?? "medium"] - PRIORITY_SCORE[b.priority ?? "medium"]
        if (pd !== 0) return pd
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })

      const tasks: FocusTask[] = sorted.map((s) => ({
        id: s.id,
        description: s.description,
        projectName: s.project.name,
        dueDate: s.dueDate,
        priority: s.priority ?? "medium",
        effortDays: s.effortDays,
        overdue: new Date(s.dueDate) < today,
        dueThisWeek: isThisWeekOrOverdue(s.dueDate),
      }))

      const committedEffort = tasks.filter((t) => t.dueThisWeek).reduce((sum, t) => sum + (t.effortDays ?? 0), 0)
      const capacityDays = capacityByName.get(owner.toLowerCase()) ?? null

      focuses.push({
        owner,
        tasks,
        committedEffort,
        capacityDays,
        overloaded: capacityDays != null && committedEffort > capacityDays,
      })
    }

    return focuses.sort((a, b) => {
      if (a.overloaded !== b.overloaded) return a.overloaded ? -1 : 1
      const aHasP0 = a.tasks.some((t) => t.priority === "high" && t.dueThisWeek)
      const bHasP0 = b.tasks.some((t) => t.priority === "high" && t.dueThisWeek)
      if (aHasP0 !== bHasP0) return aHasP0 ? -1 : 1
      return b.committedEffort - a.committedEffort
    })
  }, [nextSteps, people, selectedWeekStart, selectedWeekEnd, today])

  const weekInterrupts = useMemo(
    () => interrupts.filter((i) => {
      const d = new Date(i.date)
      return d >= selectedWeekStart && d <= selectedWeekEnd
    }),
    [interrupts, selectedWeekStart, selectedWeekEnd]
  )
  const weekInterruptHours = useMemo(() => weekInterrupts.reduce((s, i) => s + i.hours, 0), [weekInterrupts])

  const projectHealth: ProjectHealthRow[] = useMemo(() => {
    return projects.map((p) => {
      const active = pickActiveRelease(p.releases)
      return {
        id: p.id,
        name: p.name,
        strategicBucket: p.strategicBucket,
        version: active?.version ?? null,
        ragStatus: active?.ragStatus ?? null,
        phase: active?.phase ?? null,
        progressPercent: active?.progressPercent ?? null,
        isDelayed: active?.isDelayed ?? false,
        delayDays: active?.delayDays ?? null,
        needsDecision: active?.needsDecision ?? false,
      }
    })
  }, [projects])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-5 pb-1 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Weekly Plan</h1>
          <p className="text-sm text-text-muted mt-0.5">
            แผนงานรายสัปดาห์ — แก้ไข เพิ่มรายการ และติดตามความคืบหน้าได้ ย้อนดูสัปดาห์ก่อนหน้าได้ทุกเมื่อ
          </p>
        </div>
        <WeekNav
          weekStart={selectedWeekStart}
          weekEnd={selectedWeekEnd}
          isCurrentWeek={isCurrentWeek}
          onPrev={() => setSelectedWeekStart(addDays(selectedWeekStart, -7))}
          onNext={() => setSelectedWeekStart(addDays(selectedWeekStart, 7))}
          onToday={() => setSelectedWeekStart(currentWeekStart)}
        />
      </div>

      <WeekSummaryCards total={items.length} done={done} pending={pending} carriedOver={carriedOver} />

      <div className="grid grid-cols-3 gap-4 px-6 pb-4">
        <div className="col-span-2">
          {loading ? (
            <div className="rounded-xl border h-full flex items-center justify-center py-16 text-sm" style={{ background: "var(--color-card)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
              Loading…
            </div>
          ) : (
            <EditablePlanItems
              items={items}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onSync={handleSync}
              syncing={syncing}
              onChecklistAdd={handleChecklistAdd}
              onChecklistToggle={handleChecklistToggle}
              onChecklistDelete={handleChecklistDelete}
            />
          )}

          {weekInterrupts.length > 0 && (
            <div className="rounded-xl border mt-4 p-4" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  งานแทรกสัปดาห์นี้ ({weekInterrupts.length})
                </p>
                <p className="text-xs font-semibold text-text-primary">{weekInterruptHours}h รวม</p>
              </div>
              <div className="flex flex-col gap-1.5">
                {weekInterrupts.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-text-muted truncate">
                      {toDateParam(new Date(i.date))} · {i.person.name} · {i.source}
                    </span>
                    <span className="font-medium text-text-primary shrink-0">{i.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="col-span-1">
          <ProjectHealthTable rows={projectHealth} />
        </div>
      </div>

      <div className="px-6 pb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
          Weekly Focus by Person ({personFocus.length})
        </p>
        <p className="text-xs text-text-muted mb-3">อ้างอิงจากข้อมูลปัจจุบัน (live) ไม่ผูกกับสัปดาห์ที่กำลังดูอยู่</p>
        <div className="grid grid-cols-2 gap-4">
          {personFocus.map((f) => (
            <PersonFocusCard key={f.owner} focus={f} />
          ))}
        </div>
      </div>
    </div>
  )
}
