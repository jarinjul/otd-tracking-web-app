"use client"

import { useEffect, useState } from "react"
import { Cpu, Building2, PiggyBank, ArrowRight, Rocket } from "lucide-react"
import { SlidePanel } from "@/components/ui/SlidePanel"

type ReleaseCostItem = {
  id: string
  projectName: string
  version: string
  status: string
  developBy: string[]
  devLevels: string[]
  aiModels: string[]
  developTimeMonths: number | null
  internal: number
  vendorName: string | null
  vendorCost: number | null
  vendorTimeDays: number | null
  save: number | null
  savePct: number | null
}

type CostSavingsData = {
  totals: { internal: number; vendor: number; save: number; savePct: number }
  items: ReleaseCostItem[]
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  planned:     { bg: "bg-surface",           color: "text-text-muted",     label: "Planned" },
  in_progress: { bg: "bg-accent-light",      color: "text-accent",         label: "In Progress" },
  deployed:    { bg: "bg-rag-green-light",   color: "text-rag-green-text", label: "✓ Deployed" },
  rolled_back: { bg: "bg-rag-red-light",     color: "text-rag-red-text",   label: "↩ Rolled Back" },
}

const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

export function CostSavingsBanner() {
  const [data, setData] = useState<CostSavingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    fetch("/api/dashboard/cost-savings")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !data || data.totals.internal === 0) return null

  const { totals, items } = data

  return (
    <>
      <div className="mx-6 mt-4 rounded-2xl overflow-hidden border border-border shadow-sm bg-gradient-to-br from-[#111827] via-[#1E2A3A] to-[#1E293B]">
        <div className="flex items-center gap-4 px-6 py-5 flex-wrap">
          {/* Internal Dev + AI */}
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Cpu size={18} className="text-indigo-300" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/50">Internal Dev + AI Total</p>
              <p className="text-2xl font-bold tabular-nums text-white">{fmtBaht(totals.internal)} <span className="text-base font-semibold text-white/60">฿</span></p>
            </div>
          </div>

          <div className="w-px self-stretch bg-white/10 hidden sm:block" />

          {/* Vendor */}
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-white/70" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/50">Vendor Quotes Total</p>
              <p className="text-2xl font-bold tabular-nums text-white">{fmtBaht(totals.vendor)} <span className="text-base font-semibold text-white/60">฿</span></p>
            </div>
          </div>

          <div className="w-px self-stretch bg-white/10 hidden sm:block" />

          {/* Save — hero metric */}
          <div className="flex-1 min-w-[240px] flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-4 py-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 flex items-center justify-center shrink-0">
              <PiggyBank size={18} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-300/80">Total Estimate Save</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-300">
                {fmtBaht(totals.save)} <span className="text-base font-semibold">฿</span>
                <span className="ml-2 text-sm font-bold px-2 py-0.5 rounded-full bg-emerald-400/20">{totals.savePct}%</span>
              </p>
            </div>
          </div>

          {/* Review Detail button */}
          <button
            onClick={() => setDetailOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-primary hover:bg-white/90 transition-colors"
          >
            Review Detail
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <SlidePanel open={detailOpen} onClose={() => setDetailOpen(false)} width="w-[760px]">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <PiggyBank size={18} className="text-emerald-500" />
            Cost Savings — Internal Dev + AI vs Vendor
          </h2>
          <p className="text-sm text-text-muted mt-1">
            สรุปต้นทุนการพัฒนา Internal (คน + AI) เทียบกับราคาที่ต้องจ่ายหากจ้าง Vendor ทำ ในแต่ละ Release
          </p>
        </div>

        {/* Totals recap */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-border bg-surface">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Internal + AI</p>
            <p className="text-lg font-bold tabular-nums text-accent">{fmtBaht(totals.internal)} ฿</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Vendor Total</p>
            <p className="text-lg font-bold tabular-nums text-text-primary">{fmtBaht(totals.vendor)} ฿</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Save</p>
            <p className="text-lg font-bold tabular-nums text-rag-green-text">{fmtBaht(totals.save)} ฿ ({totals.savePct}%)</p>
          </div>
        </div>

        {/* Per-release list, read-only */}
        <div className="px-6 py-4 flex flex-col gap-3">
          {items.map((r) => {
            const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.planned
            const hasVendor = (r.vendorCost ?? 0) > 0
            return (
              <div key={r.id} className="border border-border rounded-card p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Rocket size={14} className="text-accent shrink-0" />
                  <span className="font-semibold text-sm text-text-primary">{r.projectName}</span>
                  <span className="text-xs text-text-muted">— {r.version}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted mb-3">
                  {r.developBy.length > 0 && <span>Dev: <strong className="text-text-primary">{r.developBy.join(", ")}</strong></span>}
                  {r.devLevels.length > 0 && <span>Level: <strong className="text-text-primary">{r.devLevels.join(", ")}</strong></span>}
                  {r.developTimeMonths != null && <span>เวลา: <strong className="text-text-primary">{r.developTimeMonths} เดือน</strong></span>}
                  {r.aiModels.length > 0 && <span>AI: <strong className="text-text-primary">{r.aiModels.join(", ")}</strong></span>}
                </div>

                <div className="grid grid-cols-3 gap-2 rounded bg-gray-50 border border-border px-3 py-2">
                  <div>
                    <p className="text-xs text-text-muted">Internal + AI</p>
                    <p className="font-bold tabular-nums text-accent text-sm">{fmtBaht(r.internal)} ฿</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">{r.vendorName ? `Vendor: ${r.vendorName}` : "Vendor Quote"}</p>
                    <p className="font-bold tabular-nums text-text-primary text-sm">{hasVendor ? `${fmtBaht(r.vendorCost!)} ฿` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Save</p>
                    <p
                      className="font-bold tabular-nums text-sm"
                      style={{ color: r.save != null && r.save >= 0 ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}
                    >
                      {r.save != null ? `${fmtBaht(r.save)} ฿ (${r.savePct}%)` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SlidePanel>
    </>
  )
}
