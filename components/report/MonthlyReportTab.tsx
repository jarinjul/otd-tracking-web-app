"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Copy, Check, Save, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { RAG_COLORS } from "@/lib/types"
import { copyHtmlToClipboard } from "@/lib/utils/clipboard"
import type { SnapshotData } from "@/lib/snapshot"

type Snapshot = { id: string; month: string; data: SnapshotData } | null

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const RAG_RANK: Record<string, number> = { red: 0, amber: 1, green: 2 }

function monthKeyNow(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}
function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
const fmtBaht = (n: number) => Math.round(n).toLocaleString("en-US")

export function MonthlyReportTab() {
  const [month, setMonth] = useState(monthKeyNow())
  const [current, setCurrent] = useState<Snapshot>(null)
  const [previous, setPrevious] = useState<Snapshot>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/snapshots?month=${month}`)
      .then((r) => r.json())
      .then((d) => { setCurrent(d.current); setPrevious(d.previous) })
      .finally(() => setLoading(false))
  }, [month])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      })
      if (res.ok) setCurrent(await res.json())
    } finally {
      setSaving(false)
    }
  }

  const ragCounts = useMemo(() => {
    if (!current) return { green: 0, amber: 0, red: 0 }
    const counts = { green: 0, amber: 0, red: 0 }
    for (const p of current.data.projects) counts[p.worstRag]++
    return counts
  }, [current])

  const projectDiffs = useMemo(() => {
    if (!current) return []
    const prevById = new Map((previous?.data.projects ?? []).map((p) => [p.id, p]))
    return current.data.projects.map((p) => {
      const prev = prevById.get(p.id)
      let trend: "up" | "down" | "flat" | "new" = "flat"
      if (!prev) trend = "new"
      else if (RAG_RANK[p.worstRag] > RAG_RANK[prev.worstRag]) trend = "up"
      else if (RAG_RANK[p.worstRag] < RAG_RANK[prev.worstRag]) trend = "down"
      return { ...p, trend }
    })
  }, [current, previous])

  async function handleCopy() {
    if (!current) return
    const d = current.data
    const html = `
      <div style="font-family:sans-serif">
        <h2>Monthly Report — ${monthLabel(month)}</h2>
        <p><b>Projects:</b> ${d.projects.length} total — 🟢 ${ragCounts.green} · 🟡 ${ragCounts.amber} · 🔴 ${ragCounts.red}</p>
        <p><b>Cost savings:</b> Internal ${fmtBaht(d.costSavings.internalTotal)}฿ · Vendor ${fmtBaht(d.costSavings.vendorTotal)}฿ · Save ${fmtBaht(d.costSavings.saveTotal)}฿</p>
        <p><b>Utilization:</b> avg ${d.workload.avgUtilizationPct}% · overloaded ${d.workload.overloadedCount} คน</p>
        <p><b>งานแทรกเดือนนี้:</b> ${d.interrupts.totalHours}h (${d.interrupts.pctOfCapacity}% ของ capacity ทีม)${d.interrupts.topSource ? ` · มากสุดจาก ${d.interrupts.topSource}` : ""}</p>
        ${d.releasesDeployedThisMonth.length > 0 ? `<p><b>ส่งมอบเดือนนี้:</b></p><ul>${d.releasesDeployedThisMonth.map((r) => `<li>${r.projectName} — ${r.version}</li>`).join("")}</ul>` : ""}
        ${d.pendingDecisions.length > 0 ? `<p><b>รอตัดสินใจ:</b></p><ul>${d.pendingDecisions.map((r) => `<li>${r.projectName} — ${r.version}${r.note ? `: ${r.note}` : ""}</li>`).join("")}</ul>` : ""}
        ${d.topRisks.length > 0 ? `<p><b>Top risks:</b></p><ul>${d.topRisks.map((r) => `<li>[${r.severity}] ${r.projectName} — ${r.description}</li>`).join("")}</ul>` : ""}
      </div>
    `.trim()
    const plain = `Monthly Report — ${monthLabel(month)}\nProjects: ${d.projects.length} (green ${ragCounts.green}, amber ${ragCounts.amber}, red ${ragCounts.red})`
    const ok = await copyHtmlToClipboard(html, plain)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))} className="p-1.5 rounded-lg border hover:bg-gray-50" style={{ borderColor: "var(--color-border)" }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary w-24 text-center">{monthLabel(month)}</span>
          <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 rounded-lg border hover:bg-gray-50" style={{ borderColor: "var(--color-border)" }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
          >
            <Save size={14} />
            {saving ? "Saving…" : current ? "Re-save snapshot" : "Save snapshot"}
          </button>
          {current && (
            <button
              type="button" onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--color-accent)" }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy for email"}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : !current ? (
        <div className="rounded-card border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-text-muted">ยังไม่มี snapshot ของเดือนนี้ กด &quot;Save snapshot&quot; เพื่อสร้าง</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!previous && (
            <p className="text-xs text-text-muted italic">ยังไม่มีข้อมูลเดือนก่อน — จะเทียบให้เมื่อมี snapshot ของเดือนที่แล้ว</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-xs text-text-muted mb-1">Projects</p>
              <p className="text-lg font-bold text-text-primary">
                {current.data.projects.length} <span style={{ color: RAG_COLORS.green }}>●{ragCounts.green}</span>{" "}
                <span style={{ color: RAG_COLORS.amber }}>●{ragCounts.amber}</span>{" "}
                <span style={{ color: RAG_COLORS.red }}>●{ragCounts.red}</span>
              </p>
            </div>
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-xs text-text-muted mb-1">Cost Save</p>
              <p className="text-lg font-bold text-text-primary">{fmtBaht(current.data.costSavings.saveTotal)}฿</p>
              {previous && (
                <p className="text-xs text-text-muted">
                  {current.data.costSavings.saveTotal >= previous.data.costSavings.saveTotal ? "↑" : "↓"} จากเดือนก่อน {fmtBaht(previous.data.costSavings.saveTotal)}฿
                </p>
              )}
            </div>
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-xs text-text-muted mb-1">Avg Utilization</p>
              <p className="text-lg font-bold text-text-primary">{current.data.workload.avgUtilizationPct}%</p>
              {previous && (
                <p className="text-xs text-text-muted">
                  {current.data.workload.avgUtilizationPct >= previous.data.workload.avgUtilizationPct ? "↑" : "↓"} จากเดือนก่อน {previous.data.workload.avgUtilizationPct}%
                </p>
              )}
            </div>
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-xs text-text-muted mb-1">งานแทรก</p>
              <p className="text-lg font-bold text-text-primary">{current.data.interrupts.totalHours}h</p>
              <p className="text-xs text-text-muted">{current.data.interrupts.pctOfCapacity}% ของ capacity</p>
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-4">
            <p className="text-sm font-semibold text-text-primary mb-2">RAG เทียบเดือนก่อน</p>
            <div className="flex flex-col gap-1.5">
              {projectDiffs.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-text-primary truncate">{p.name}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ background: RAG_COLORS[p.worstRag] }} />
                    {p.trend === "up" && <ArrowUp size={12} className="text-rag-red-text" />}
                    {p.trend === "down" && <ArrowDown size={12} className="text-rag-green-text" />}
                    {p.trend === "flat" && <Minus size={12} className="text-text-muted" />}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {current.data.releasesDeployedThisMonth.length > 0 && (
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-sm font-semibold text-text-primary mb-2">ส่งมอบเดือนนี้ ({current.data.releasesDeployedThisMonth.length})</p>
              <ul className="flex flex-col gap-1 text-sm text-text-primary list-disc pl-4">
                {current.data.releasesDeployedThisMonth.map((r, i) => <li key={i}>{r.projectName} — {r.version}</li>)}
              </ul>
            </div>
          )}

          {current.data.pendingDecisions.length > 0 && (
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-sm font-semibold text-text-primary mb-2">รอตัดสินใจ ({current.data.pendingDecisions.length})</p>
              <ul className="flex flex-col gap-1 text-sm text-text-primary list-disc pl-4">
                {current.data.pendingDecisions.map((r, i) => <li key={i}>{r.projectName} — {r.version}{r.note ? `: ${r.note}` : ""}</li>)}
              </ul>
            </div>
          )}

          {current.data.topRisks.length > 0 && (
            <div className="rounded-card border border-border bg-card p-4">
              <p className="text-sm font-semibold text-text-primary mb-2">Top Risks</p>
              <ul className="flex flex-col gap-1 text-sm text-text-primary list-disc pl-4">
                {current.data.topRisks.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium" style={{ color: RAG_COLORS[r.severity === "high" ? "red" : r.severity === "medium" ? "amber" : "green"] }}>
                      [{r.severity}]
                    </span>{" "}
                    {r.projectName} — {r.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
