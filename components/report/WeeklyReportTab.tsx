"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Check } from "lucide-react"
import { weekStart as computeWeekStart, addDays, formatDate, toDateParam } from "@/lib/utils/date"
import { monthKey, TARGET_RATIO } from "@/lib/utils/workload"
import { WeekNav } from "@/components/weekly-plan/WeekNav"
import { copyHtmlToClipboard } from "@/lib/utils/clipboard"

type PlanItem = {
  id: string
  itemType: string | null
  title: string
  subtitle: string | null
  projectName: string | null
  status: "pending" | "done" | "carried_over"
}
type InterruptEntry = { id: string; date: string; hours: number; source: string; person: { name: string } }
type PersonOpt = { id: string; name: string; monthlyCapacityHours: number }
type WorkloadEntry = { personId: string; month: string; hours: number }

const FLAG_TYPES = new Set(["critical", "delayed", "decision", "blocker"])

export function WeeklyReportTab() {
  const today = useMemo(() => new Date(), [])
  const currentWeekStart = useMemo(() => computeWeekStart(today), [today])
  const [weekStartDate, setWeekStartDate] = useState(currentWeekStart)
  const weekEndDate = useMemo(() => addDays(weekStartDate, 6), [weekStartDate])
  const isCurrentWeek = weekStartDate.getTime() === currentWeekStart.getTime()

  const [items, setItems] = useState<PlanItem[]>([])
  const [interrupts, setInterrupts] = useState<InterruptEntry[]>([])
  const [people, setPeople] = useState<PersonOpt[]>([])
  const [workloadEntries, setWorkloadEntries] = useState<WorkloadEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/weekly-plan?week=${toDateParam(weekStartDate)}`)
      .then((r) => r.json())
      .then((plan) => setItems(plan.items ?? []))
      .finally(() => setLoading(false))
  }, [weekStartDate])

  useEffect(() => {
    const startMonth = monthKey(weekStartDate)
    const endMonth = monthKey(weekEndDate)
    const months = Array.from(new Set([startMonth, endMonth]))
    Promise.all(months.map((m) => fetch(`/api/interrupts?month=${m}`).then((r) => r.json())))
      .then((batches) => setInterrupts(batches.flat()))
  }, [weekStartDate, weekEndDate])

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then((p) => setPeople(p.map((x: any) => ({ id: x.id, name: x.name, monthlyCapacityHours: x.monthlyCapacityHours }))))
    fetch("/api/workload").then((r) => r.json()).then(setWorkloadEntries)
  }, [])

  const weekInterrupts = useMemo(
    () => interrupts.filter((i) => { const d = new Date(i.date); return d >= weekStartDate && d <= weekEndDate }),
    [interrupts, weekStartDate, weekEndDate]
  )
  const weekInterruptHours = weekInterrupts.reduce((s, i) => s + i.hours, 0)

  const flaggedItems = items.filter((i) => i.itemType && FLAG_TYPES.has(i.itemType))
  const done = items.filter((i) => i.status === "done").length
  const pending = items.filter((i) => i.status === "pending").length
  const carried = items.filter((i) => i.status === "carried_over").length

  const overloadedPeople = useMemo(() => {
    const key = monthKey(weekStartDate)
    const hoursByPerson = new Map<string, number>()
    for (const e of workloadEntries) {
      if (monthKey(e.month) !== key) continue
      hoursByPerson.set(e.personId, (hoursByPerson.get(e.personId) ?? 0) + e.hours)
    }
    return people
      .map((p) => {
        const target = p.monthlyCapacityHours * TARGET_RATIO
        const hours = hoursByPerson.get(p.id) ?? 0
        const pct = target > 0 ? Math.round((hours / target) * 1000) / 10 : 0
        return { name: p.name, pct }
      })
      .filter((p) => p.pct > 110)
      .sort((a, b) => b.pct - a.pct)
  }, [people, workloadEntries, weekStartDate])

  async function handleCopy() {
    const rangeLabel = `${formatDate(weekStartDate)} – ${formatDate(weekEndDate)}`
    const html = `
      <div style="font-family:sans-serif">
        <h2>Weekly Update — ${rangeLabel}</h2>
        <p><b>Plan items:</b> ${items.length} total — ${done} done, ${pending} pending, ${carried} carried over</p>
        ${flaggedItems.length > 0 ? `<p><b>⚠ Needs attention:</b></p><ul>${flaggedItems.map((i) => `<li>${i.title}</li>`).join("")}</ul>` : ""}
        ${weekInterrupts.length > 0 ? `<p><b>งานแทรกสัปดาห์นี้:</b> ${weekInterruptHours}h (${weekInterrupts.length} ครั้ง)</p><ul>${weekInterrupts.map((i) => `<li>${toDateParam(new Date(i.date))} · ${i.person.name} · ${i.source} · ${i.hours}h</li>`).join("")}</ul>` : ""}
        ${overloadedPeople.length > 0 ? `<p><b>คนที่โหลดเกิน 110% เดือนนี้:</b> ${overloadedPeople.map((p) => `${p.name} (${p.pct}%)`).join(", ")}</p>` : ""}
      </div>
    `.trim()
    const plain = `Weekly Update — ${rangeLabel}\nPlan items: ${items.length} total (${done} done, ${pending} pending, ${carried} carried)`
    const ok = await copyHtmlToClipboard(html, plain)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <WeekNav
          weekStart={weekStartDate}
          weekEnd={weekEndDate}
          isCurrentWeek={isCurrentWeek}
          onPrev={() => setWeekStartDate(addDays(weekStartDate, -7))}
          onNext={() => setWeekStartDate(addDays(weekStartDate, 7))}
          onToday={() => setWeekStartDate(currentWeekStart)}
        />
        <button
          type="button" onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--color-accent)" }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy for email"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-xs text-text-muted mb-1">Plan Items</p>
              <p className="text-2xl font-bold text-text-primary">{items.length}</p>
            </div>
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-xs text-text-muted mb-1">Done / Pending / Carried</p>
              <p className="text-lg font-bold text-text-primary">{done} / {pending} / {carried}</p>
            </div>
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-xs text-text-muted mb-1">งานแทรกสัปดาห์นี้</p>
              <p className="text-2xl font-bold text-text-primary">{weekInterruptHours}h</p>
            </div>
          </div>

          {flaggedItems.length > 0 && (
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-sm font-semibold text-text-primary mb-2">⚠ ต้องดูเป็นพิเศษ</p>
              <ul className="flex flex-col gap-1 text-sm text-text-primary list-disc pl-4">
                {flaggedItems.map((i) => <li key={i.id}>{i.title}</li>)}
              </ul>
            </div>
          )}

          {overloadedPeople.length > 0 && (
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-sm font-semibold text-text-primary mb-2">คนที่โหลดเกิน 110% เดือนนี้</p>
              <div className="flex flex-wrap gap-2">
                {overloadedPeople.map((p) => (
                  <span key={p.name} className="px-2 py-1 rounded-full text-xs font-medium bg-rag-red-light text-rag-red-text">
                    {p.name} ({p.pct}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {weekInterrupts.length > 0 && (
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-sm font-semibold text-text-primary mb-2">งานแทรกสัปดาห์นี้ ({weekInterrupts.length})</p>
              <div className="flex flex-col gap-1.5">
                {weekInterrupts.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{toDateParam(new Date(i.date))} · {i.person.name} · {i.source}</span>
                    <span className="font-medium text-text-primary">{i.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
