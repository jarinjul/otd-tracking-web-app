import { Rocket } from "lucide-react"
import { formatDateShort } from "@/lib/utils/date"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { BlockersSection } from "@/components/project/BlockersSection"
import { NextStepsSection } from "@/components/project/NextStepsSection"
import type { ReleaseWithRelations } from "@/lib/types"

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  planned:     { bg: "var(--color-surface)",         color: "var(--color-text-muted)",     label: "Planned" },
  in_progress: { bg: "var(--color-accent-light)",    color: "var(--color-accent)",         label: "In Progress" },
  deployed:    { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)", label: "✓ Deployed" },
  rolled_back: { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)",   label: "↩ Rolled Back" },
}

const RAG_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  green: { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)", label: "🟢 Green" },
  amber: { bg: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)", label: "🟡 Amber" },
  red:   { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)",   label: "🔴 Red" },
}

const PHASE_LABELS: Record<string, string> = {
  ideation: "Ideation",
  alignment: "Alignment",
  prd_signoff: "PRD Sign-off",
  development: "Development",
  testing: "Testing",
  uat: "UAT",
  production: "Production",
  completed: "Completed",
}

const DEV_RATES: Record<string, number> = { M1: 3180, S4: 1590, S3: 1115, S2: 830, S1: 575 }

const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

type DevEntry = { developBy: string; devLevel: string; developTimeMonths: number | null; manhours: number | null }
type AiEntry = { model: string; cost: number | null }

interface ReleasesSectionProps {
  releases: ReleaseWithRelations[]
}

export function ReleasesSection({ releases }: ReleasesSectionProps) {
  if (releases.length === 0) {
    return <p className="text-sm text-text-muted">No releases recorded yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {releases.map((r) => {
        const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.planned
        const rag = RAG_STYLE[r.ragStatus] ?? RAG_STYLE.green
        const devEntries = ((r.devEntries as unknown as DevEntry[]) ?? [])
        const aiEntries = ((r.aiEntries as unknown as AiEntry[]) ?? [])

        const humanCost = devEntries.reduce((s, e) => s + (e.manhours ?? 0) * (e.devLevel ? DEV_RATES[e.devLevel] ?? 0 : 0), 0)
        const aiCost = aiEntries.reduce((s, e) => s + (e.cost ?? 0), 0)
        const internalTotal = humanCost + aiCost
        const hasVendor = (r.vendorCost ?? 0) > 0
        const save = hasVendor ? r.vendorCost! - internalTotal : 0
        const savePct = hasVendor ? Math.round((save / r.vendorCost!) * 100) : 0

        const maxDevTime = devEntries.reduce((m, e) => (e.developTimeMonths != null ? Math.max(m, e.developTimeMonths) : m), 0)
        const maxDevTimeDays = Math.round(maxDevTime * 30)
        const timeSaved = hasVendor && r.vendorTimeDays != null && maxDevTime > 0 ? r.vendorTimeDays - maxDevTimeDays : null

        return (
          <div key={r.id} className="border border-border rounded-card p-3">
            {/* Header row: version + status + date */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Rocket size={14} className="text-accent shrink-0" />
              <span className="font-semibold text-sm text-text-primary">{r.version}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: rag.bg, color: rag.color }}>
                {rag.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.color }}>
                {st.label}
              </span>
              {r.releaseDate && (
                <span className="ml-auto text-xs text-text-muted">{formatDateShort(r.releaseDate)}</span>
              )}
            </div>

            {(r.startDate || r.endDate) && (
              <p className="text-xs text-text-muted mb-2">
                Timeline: {r.startDate ? formatDateShort(r.startDate) : "—"} → {r.endDate ? formatDateShort(r.endDate) : "—"}
              </p>
            )}

            {/* Phase + Progress */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-text-muted">
                Phase: <strong className="text-text-primary">{PHASE_LABELS[r.phase] ?? r.phase}</strong>
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1"><ProgressBar value={r.progressPercent} /></div>
                <span className="text-xs font-semibold text-text-primary shrink-0">{r.progressPercent}%</span>
              </div>
            </div>

            {/* Delay warning */}
            {r.isDelayed && (
              <div className="mb-2 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--color-rag-red-light)", color: "var(--color-rag-red-text)" }}>
                ⚠ Delayed{r.delayDays != null ? ` — ${r.delayDays} day${r.delayDays !== 1 ? "s" : ""} late` : ""}
              </div>
            )}

            {/* Needs decision */}
            {r.needsDecision && (
              <div className="mb-2 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)" }}>
                <span className="font-semibold">⚠ Needs Decision</span>
                {r.decisionNote && <> — {r.decisionNote}</>}
              </div>
            )}

            {/* Internal Dev entries */}
            {devEntries.length > 0 && (
              <div className="flex flex-col gap-1 mb-2">
                {devEntries.map((e, i) => (
                  <div key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted">
                    {e.developBy && <span>Dev: <strong className="text-text-primary">{e.developBy}</strong></span>}
                    {e.devLevel && <span>Level: <strong className="text-text-primary">{e.devLevel}</strong></span>}
                    {e.developTimeMonths != null && <span>เวลา: <strong className="text-text-primary">{e.developTimeMonths} เดือน</strong></span>}
                    {e.manhours != null && <span>Manhours: <strong className="text-text-primary">{e.manhours.toLocaleString()}</strong></span>}
                  </div>
                ))}
              </div>
            )}

            {/* AI entries */}
            {aiEntries.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted mb-2">
                {aiEntries.map((e, i) => (
                  <span key={i}>
                    AI: <strong className="text-text-primary">{e.model}</strong>
                    {e.cost != null && <> ({fmtBaht(e.cost)} ฿)</>}
                  </span>
                ))}
              </div>
            )}

            {/* Cost comparison */}
            {internalTotal > 0 && (
              <div className="rounded bg-gray-50 border border-border px-3 py-2 mb-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-text-muted">Internal + AI</p>
                    <p className="font-bold tabular-nums text-accent">{fmtBaht(internalTotal)} ฿</p>
                  </div>
                  <div>
                    <p className="text-text-muted">{r.vendorName ? `Vendor: ${r.vendorName}` : "Vendor Quote"}</p>
                    <p className="font-bold tabular-nums text-text-primary">{hasVendor ? `${fmtBaht(r.vendorCost!)} ฿` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Save</p>
                    <p className="font-bold tabular-nums" style={{ color: save >= 0 ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}>
                      {hasVendor ? `${fmtBaht(save)} ฿ (${savePct}%)` : "—"}
                    </p>
                  </div>
                </div>
                {timeSaved != null && (
                  <p className="text-xs text-text-muted mt-1.5 pt-1.5 border-t border-border">
                    เวลา: Internal {maxDevTime} เดือน (~{maxDevTimeDays} วัน) vs Vendor {r.vendorTimeDays} วัน —{" "}
                    <span className="font-semibold" style={{ color: timeSaved >= 0 ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}>
                      {timeSaved >= 0 ? `เร็วกว่า ${timeSaved} วัน` : `ช้ากว่า ${Math.abs(timeSaved)} วัน`}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Features */}
            {(r.features ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {r.features.map((f, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-text-muted px-2 py-0.5 rounded-badge">{f}</span>
                ))}
              </div>
            )}

            {/* Deploy note */}
            {r.deployNote && (
              <p className="text-xs text-text-muted mb-1">
                <span className="font-medium text-text-primary">Deploy:</span> {r.deployNote}
              </p>
            )}

            {/* Release notes */}
            {r.releaseNotes && (
              <p className="text-xs text-text-muted whitespace-pre-line">{r.releaseNotes}</p>
            )}

            {/* Blockers & Risks — sub-data of this release */}
            {((r.blockers?.length ?? 0) > 0 || (r.risks?.length ?? 0) > 0) && (
              <div className="mt-3 pt-3 border-t border-border">
                <BlockersSection blockers={r.blockers ?? []} risks={r.risks ?? []} />
              </div>
            )}

            {/* Next Steps — sub-data of this release */}
            {(r.nextSteps?.length ?? 0) > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Next Steps</h4>
                <NextStepsSection steps={r.nextSteps ?? []} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
