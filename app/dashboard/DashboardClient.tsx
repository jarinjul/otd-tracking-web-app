"use client"

import { useDashboardStore } from "@/lib/stores/dashboardStore"
import { PortfolioTabs } from "@/components/dashboard/PortfolioTabs"
import { SummaryBar } from "@/components/dashboard/SummaryBar"
import { FilterBar } from "@/components/dashboard/FilterBar"
import { ProjectCard } from "@/components/dashboard/ProjectCard"
import { StrategicBucketsSection } from "@/components/dashboard/StrategicBucketsSection"
import { CostSavingsBanner } from "@/components/dashboard/CostSavingsBanner"
import { ProjectDetailPanel } from "@/components/project/ProjectDetailPanel"
import { defaultSort } from "@/lib/utils/sort"
import { worstRagStatus } from "@/lib/utils/rag"
import type { ProjectWithRelations } from "@/lib/types"
import type { Person } from "@/lib/types"

interface DashboardClientProps {
  projects: ProjectWithRelations[]
  people: Pick<Person, "id" | "name">[]
}

export function DashboardClient({ projects, people }: DashboardClientProps) {
  const {
    activeBucket, filterStatus, filterPhase, filterPerson, sortMode, searchQuery,
    openProjectId, setOpenProjectId,
  } = useDashboardStore()

  // Count projects per bucket for tab badges
  const bucketCounts: Record<string, number> = {}
  for (const p of projects) {
    const key = (p as any).strategicBucket ?? "UNASSIGNED"
    bucketCounts[key] = (bucketCounts[key] ?? 0) + 1
  }

  // Filter to active bucket (or all)
  let filtered = activeBucket === "all"
    ? [...projects]
    : projects.filter((p) => ((p as any).strategicBucket ?? null) === activeBucket)

  // Status counts for summary bar (pre-filter, just the bucket slice)
  // Uses the worst RAG status across each project's releases, same as the status icon on ProjectCard.
  const bucketProjects = filtered
  const green = bucketProjects.filter((p) => worstRagStatus(p) === "green").length
  const amber = bucketProjects.filter((p) => worstRagStatus(p) === "amber").length
  const red   = bucketProjects.filter((p) => worstRagStatus(p) === "red").length

  // Apply remaining filters
  if (filterStatus !== "all") filtered = filtered.filter((p) => worstRagStatus(p) === filterStatus)
  if (filterPhase !== "all")  filtered = filtered.filter((p) => p.phase === filterPhase)
  if (filterPerson !== "all") filtered = filtered.filter((p) => p.teamMembers.some((m) => m.personId === filterPerson))
  if (searchQuery.trim())     filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Sort
  if (sortMode === "critical_first") filtered = defaultSort(filtered)
  else if (sortMode === "progress_asc")  filtered = [...filtered].sort((a, b) => a.progressPercent - b.progressPercent)
  else if (sortMode === "progress_desc") filtered = [...filtered].sort((a, b) => b.progressPercent - a.progressPercent)
  else if (sortMode === "deadline_asc")  filtered = [...filtered].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const openProject = projects.find((p) => p.id === openProjectId) ?? null

  return (
    <div className="flex flex-col h-full">
      <CostSavingsBanner />
      <PortfolioTabs counts={bucketCounts} total={projects.length} />
      <SummaryBar total={bucketProjects.length} green={green} amber={amber} red={red} />
      <StrategicBucketsSection />
      <FilterBar people={people} />

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-text-muted text-sm">
            No projects match the current filters.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

      {/* Project detail slide panel */}
      <ProjectDetailPanel project={openProject} onClose={() => setOpenProjectId(null)} />
    </div>
  )
}
