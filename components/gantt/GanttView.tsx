"use client"

import { useState } from "react"
import { useGanttStore } from "@/lib/stores/ganttStore"
import { GanttHeader } from "@/components/gantt/GanttHeader"
import { GanttRow } from "@/components/gantt/GanttRow"
import { TodayLine } from "@/components/gantt/TodayLine"
import { ReleaseDetailPanel } from "@/components/gantt/ReleaseDetailPanel"
import { filterByPerson } from "@/lib/utils/gantt"
import { BUCKET_SHORT_LABELS } from "@/lib/types"
import type { ProjectWithRelations, ReleaseWithRelations } from "@/lib/types"

const LABEL_WIDTH = 340
const VIEW_DAYS: Record<string, number> = { day: 14, week: 56, month: 90 }

interface GanttViewProps {
  projects: ProjectWithRelations[]
}

export function GanttView({ projects }: GanttViewProps) {
  const { viewMode, groupFilter, personFilter, viewStart } = useGanttStore()
  const totalDays = VIEW_DAYS[viewMode]
  const [openReleaseId, setOpenReleaseId] = useState<string | null>(null)

  // Filter by bucket and person
  let filtered = projects
  if (groupFilter !== "all") filtered = filtered.filter((p) => ((p as any).strategicBucket ?? null) === groupFilter)
  if (personFilter !== "all") filtered = filterByPerson(filtered, personFilter)

  // Group by strategicBucket
  const buckets = Array.from(new Set(filtered.map((p) => (p as any).strategicBucket ?? "UNASSIGNED"))) as string[]

  // Find the release + its parent project across all projects
  let openRelease: ReleaseWithRelations | null = null
  let openReleaseProject: ProjectWithRelations | null = null
  if (openReleaseId) {
    for (const p of projects) {
      const found = (p.releases ?? []).find((r) => r.id === openReleaseId)
      if (found) {
        openRelease = found
        openReleaseProject = p
        break
      }
    }
  }

  return (
    <>
      <div className="relative flex-1 overflow-auto border border-border rounded-card mx-6 my-4 bg-card">
        {/* Header row */}
        <GanttHeader viewStart={viewStart} totalDays={totalDays} viewMode={viewMode} labelWidth={LABEL_WIDTH} />

        {/* Today line */}
        <TodayLine viewStart={viewStart} totalDays={totalDays} labelWidth={LABEL_WIDTH} />

        {/* Project rows by bucket */}
        {buckets.map((bucket) => (
          <div key={bucket}>
            {/* Group separator */}
            <div className="flex border-b border-border bg-surface">
              <div className="shrink-0 px-3 py-2 border-r border-border font-semibold text-xs text-text-muted uppercase tracking-wider" style={{ width: LABEL_WIDTH }}>
                {BUCKET_SHORT_LABELS[bucket] ?? bucket}
              </div>
              <div className="flex-1 py-2" />
            </div>
            {/* Project rows */}
            {filtered
              .filter((p) => ((p as any).strategicBucket ?? "UNASSIGNED") === bucket)
              .map((project) => (
                <GanttRow
                  key={project.id}
                  project={project}
                  viewStart={viewStart}
                  totalDays={totalDays}
                  labelWidth={LABEL_WIDTH}
                  onReleaseClick={setOpenReleaseId}
                />
              ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">
            No projects match the current filters.
          </div>
        )}
      </div>

      {/* Release detail panel */}
      <ReleaseDetailPanel release={openRelease} project={openReleaseProject} onClose={() => setOpenReleaseId(null)} />
    </>
  )
}
