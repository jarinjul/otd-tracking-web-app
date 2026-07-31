"use client"

import { SlidePanel } from "@/components/ui/SlidePanel"
import { RAGBadge } from "@/components/ui/RAGBadge"
import { PortfolioBadge } from "@/components/ui/PortfolioBadge"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { ProgressStepper } from "@/components/project/ProgressStepper"
import { TeamSection } from "@/components/project/TeamSection"
import { BlockersSection } from "@/components/project/BlockersSection"
import { DecisionBox } from "@/components/project/DecisionBox"
import { NextStepsSection } from "@/components/project/NextStepsSection"
import { ReleasesSection } from "@/components/project/ReleasesSection"
import { formatDate, formatDateShort, countdownLabel, daysBetween, isOverdue } from "@/lib/utils/date"
import { PHASE_LABELS, RAG_COLORS } from "@/lib/types"
import type { ReleaseWithRelations, ProjectWithRelations, Phase, RagStatus } from "@/lib/types"

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  planned:     { bg: "var(--color-surface)",         color: "var(--color-text-muted)",     label: "Planned" },
  in_progress: { bg: "var(--color-accent-light)",    color: "var(--color-accent)",         label: "In Progress" },
  deployed:    { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)", label: "✓ Deployed" },
  rolled_back: { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)",   label: "↩ Rolled Back" },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 border-b border-border">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

interface ReleaseDetailPanelProps {
  release: ReleaseWithRelations | null
  project: ProjectWithRelations | null
  onClose: () => void
}

export function ReleaseDetailPanel({ release, project, onClose }: ReleaseDetailPanelProps) {
  const st = release ? STATUS_STYLE[release.status] ?? STATUS_STYLE.planned : null

  // Timeline metrics — computed from the release's own start/end when present
  const hasRange = release && release.startDate && release.endDate
  const duration = hasRange ? daysBetween(new Date(release!.startDate!), new Date(release!.endDate!)) : null
  const overdue = release?.endDate ? isOverdue(release.endDate) : false
  const countdown = release?.endDate ? countdownLabel(release.endDate) : null

  // Mini gantt bar math
  const start = release?.startDate ? new Date(release.startDate) : null
  const end = release?.endDate ? new Date(release.endDate) : null
  const today = new Date()
  const totalMs = start && end ? Math.max(1, end.getTime() - start.getTime()) : 1
  const todayPct = start && end ? Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / totalMs) * 100)) : 0

  return (
    <SlidePanel open={!!release} onClose={onClose} width="w-[820px]">
      {release && project && (
        <>
          {/* Header */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <RAGBadge status={release.ragStatus as RagStatus} pulse={release.ragStatus === "red"} />
              <PortfolioBadge bucket={(project as any).strategicBucket} />
              {st && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-text-primary">{release.version}</h2>
            <p className="text-sm text-text-muted mt-1">{project.name}</p>
            {(release.startDate || release.endDate || release.releaseDate) && (
              <p className="text-xs text-text-muted mt-2">
                {release.startDate && release.endDate && `Timeline: ${formatDateShort(release.startDate)} → ${formatDateShort(release.endDate)}`}
                {release.releaseDate && <span className="ml-2">· Release Date: {formatDateShort(release.releaseDate)}</span>}
              </p>
            )}
          </div>

          {/* Body: two-col layout — stepper left, content right */}
          <div className="flex">
            {/* Left: Progress Stepper (release phase) */}
            <div className="w-44 shrink-0 border-r border-border px-4 py-5">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-4">Timeline</h3>
              <ProgressStepper currentPhase={release.phase as Phase} />
            </div>

            {/* Right: everything else */}
            <div className="flex-1 overflow-y-auto">
              {/* Key Metrics */}
              <Section title="Key Metrics">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Progress</span>
                    <span className="text-2xl font-bold text-text-primary">{release.progressPercent}%</span>
                    <ProgressBar value={release.progressPercent} />
                  </div>

                  {release.endDate && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Deadline</span>
                      <span className="text-sm font-semibold text-text-primary">{formatDate(release.endDate)}</span>
                      <span className={`text-xs font-medium ${overdue ? "text-rag-red" : "text-text-muted"}`}>
                        {overdue && "⚠ "}{countdown}
                      </span>
                    </div>
                  )}

                  {duration != null && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Duration</span>
                      <span className="text-sm font-semibold text-text-primary">{duration} days</span>
                      <span className="text-xs text-text-muted">
                        {formatDate(release.startDate!)} – {formatDate(release.endDate!)}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Phase</span>
                    <span className="text-sm font-semibold text-text-primary">{PHASE_LABELS[release.phase]}</span>
                  </div>
                </div>

                {release.isDelayed && (
                  <div className="mt-3 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "var(--color-rag-red-light)", color: "var(--color-rag-red-text)" }}>
                    ⚠ Delayed{release.delayDays != null ? ` — ${release.delayDays} day${release.delayDays !== 1 ? "s" : ""} late` : ""}
                  </div>
                )}
              </Section>

              {/* Timeline View — mini gantt bar for this release */}
              {start && end && (
                <Section title="Timeline View">
                  <div className="flex flex-col gap-2">
                    <div className="relative h-5 rounded bg-gray-100 overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full rounded opacity-80"
                        style={{ width: "100%", backgroundColor: RAG_COLORS[release.ragStatus as RagStatus] + "33" }}
                      />
                      <div
                        className="absolute top-0 left-0 h-full rounded"
                        style={{ width: `${Math.min(100, release.progressPercent)}%`, backgroundColor: RAG_COLORS[release.ragStatus as RagStatus] }}
                      />
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div className="absolute top-0 w-0.5 h-full bg-accent" style={{ left: `${todayPct}%` }} />
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>{formatDateShort(release.startDate!)}</span>
                      <span className="text-accent font-medium">Today</span>
                      <span>{formatDateShort(release.endDate!)}</span>
                    </div>
                  </div>
                </Section>
              )}

              {/* Team */}
              <Section title="Team & Responsibilities">
                <TeamSection project={project} />
              </Section>

              {/* Decision Box */}
              {release.needsDecision && (
                <div className="px-6 py-5 border-b border-border">
                  <DecisionBox note={release.decisionNote} />
                </div>
              )}

              {/* Blockers & Risks */}
              <Section title="Blockers & Risks">
                <BlockersSection blockers={release.blockers} risks={release.risks} />
              </Section>

              {/* Next Steps */}
              <Section title="Next Steps">
                <NextStepsSection steps={release.nextSteps} />
              </Section>

              {/* This release only — includes features, cost, deploy note, release notes */}
              <Section title="Releases & Deployments">
                <ReleasesSection releases={[release]} />
              </Section>

              {/* Stakeholders */}
              {project.stakeholders.length > 0 && (
                <Section title="External Stakeholders">
                  <div className="flex flex-wrap gap-2">
                    {project.stakeholders.map((s, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-text-muted px-2 py-1 rounded-badge">{s}</span>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </>
      )}
    </SlidePanel>
  )
}
