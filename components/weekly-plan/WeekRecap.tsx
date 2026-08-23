"use client"

import { useEffect, useState } from "react"
import { Check, X, RotateCcw, ArrowRight, Plus } from "lucide-react"
import { formatDate, addDays, toDateParam } from "@/lib/utils/date"
import type { PlanItem } from "./EditablePlanItems"

interface WeekRecapProps {
  weekStart: Date
  items: PlanItem[]
  interruptHours: number
  onCarry: (itemId: string) => Promise<PlanItem>
}

export function WeekRecap({ weekStart, items, interruptHours, onCarry }: WeekRecapProps) {
  const nextWeekStart = addDays(weekStart, 7)
  const nextWeekEnd = addDays(nextWeekStart, 6)
  const nextWeekParam = toDateParam(nextWeekStart)

  const [nextWeekItems, setNextWeekItems] = useState<PlanItem[]>([])
  const [nextWeekPlanId, setNextWeekPlanId] = useState<string | null>(null)
  const [loadingNext, setLoadingNext] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [carryingIds, setCarryingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setLoadingNext(true)
    fetch(`/api/weekly-plan?week=${nextWeekParam}`)
      .then((r) => r.json())
      .then((plan) => {
        if (cancelled) return
        setNextWeekPlanId(plan.id)
        setNextWeekItems(plan.items ?? [])
      })
      .finally(() => { if (!cancelled) setLoadingNext(false) })
    return () => { cancelled = true }
  }, [nextWeekParam])

  const done = items.filter((i) => i.status === "done")
  const pending = items.filter((i) => i.status === "pending")
  const carried = items.filter((i) => i.status === "carried_over")
  const total = items.length
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0

  async function handleCarryClick(itemId: string) {
    setCarryingIds((prev) => new Set(prev).add(itemId))
    try {
      const carriedItem = await onCarry(itemId)
      setNextWeekItems((prev) => (prev.some((i) => i.id === carriedItem.id) ? prev : [...prev, carriedItem]))
    } finally {
      setCarryingIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  async function handleAddNext() {
    const title = newTitle.trim()
    if (!title || !nextWeekPlanId) return
    setNewTitle("")
    const res = await fetch("/api/weekly-plan/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekPlanId: nextWeekPlanId, title, subtitle: "", note: "", projectName: "", owner: "" }),
    })
    const created = await res.json()
    setNextWeekItems((prev) => [...prev, created])
  }

  return (
    <div className="rounded-xl border mt-4" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
      <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Week Recap — ใช้ในประชุมศุกร์</span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          เสร็จ {done.length}/{total} ({pct}%) · งานแทรก {interruptHours}h
        </span>
      </div>

      <div className="p-4 flex flex-col gap-1.5">
        {total === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: "var(--color-text-muted)" }}>ยังไม่มีรายการในสัปดาห์นี้</p>
        ) : (
          <>
            {done.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <Check size={14} style={{ color: "var(--color-rag-green)" }} className="shrink-0" />
                <span className="flex-1 min-w-0 truncate" style={{ color: "var(--color-text-muted)", textDecoration: "line-through" }}>
                  {item.title}
                </span>
              </div>
            ))}
            {pending.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <X size={14} style={{ color: "var(--color-rag-red)" }} className="shrink-0" />
                <span className="flex-1 min-w-0 truncate" style={{ color: "var(--color-text-primary)" }}>{item.title}</span>
                <button
                  onClick={() => handleCarryClick(item.id)}
                  disabled={carryingIds.has(item.id)}
                  className="text-[11px] px-2 py-1 rounded-lg border font-medium shrink-0 disabled:opacity-50 flex items-center gap-1"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
                >
                  ยกไป next week <ArrowRight size={11} />
                </button>
              </div>
            ))}
            {carried.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <RotateCcw size={14} style={{ color: "var(--color-rag-amber)" }} className="shrink-0" />
                <span className="flex-1 min-w-0 truncate" style={{ color: "var(--color-text-muted)" }}>{item.title}</span>
                <span className="text-[11px] shrink-0" style={{ color: "var(--color-rag-amber-text)" }}>→ ไป next week แล้ว</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="px-4 pb-4 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
            แผน next week ({formatDate(nextWeekStart)} – {formatDate(nextWeekEnd)})
          </span>
          <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{nextWeekItems.length} รายการ</span>
        </div>

        <div className="flex flex-col gap-1">
          {loadingNext ? (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>กำลังโหลด…</p>
          ) : (
            nextWeekItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 min-w-0 truncate" style={{ color: "var(--color-text-muted)" }}>{item.title}</span>
                {item.carriedFromId && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)" }}
                  >
                    carry
                  </span>
                )}
              </div>
            ))
          )}
          <div className="flex items-center gap-2 mt-1">
            <Plus size={12} style={{ color: "var(--color-text-muted)" }} className="shrink-0" />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddNext() }}
              onBlur={handleAddNext}
              placeholder="เพิ่มแผนสัปดาห์หน้า…"
              className="flex-1 text-xs bg-transparent outline-none"
              style={{ color: "var(--color-text-primary)" }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
