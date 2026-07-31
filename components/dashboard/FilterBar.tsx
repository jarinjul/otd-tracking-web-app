"use client"

import { Search } from "lucide-react"
import { useDashboardStore } from "@/lib/stores/dashboardStore"
import { PHASE_LABELS, type Phase } from "@/lib/types"
import type { Person } from "@/lib/types"

const PHASES = Object.entries(PHASE_LABELS) as [Phase, string][]

interface FilterBarProps {
  people: Pick<Person, "id" | "name">[]
}

export function FilterBar({ people }: FilterBarProps) {
  const {
    filterStatus, filterPhase, filterPerson, sortMode, searchQuery,
    setFilterStatus, setFilterPhase, setFilterPerson, setSortMode, setSearchQuery,
  } = useDashboardStore()

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-surface">
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value as any)}
        className="px-3 py-1.5 rounded border border-border bg-card text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="all">All Status</option>
        <option value="green">🟢 On Track</option>
        <option value="amber">🟡 At Risk</option>
        <option value="red">🔴 Critical</option>
      </select>

      <select
        value={filterPhase}
        onChange={(e) => setFilterPhase(e.target.value)}
        className="px-3 py-1.5 rounded border border-border bg-card text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="all">All Phase</option>
        {PHASES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      <select
        value={filterPerson}
        onChange={(e) => setFilterPerson(e.target.value)}
        className="px-3 py-1.5 rounded border border-border bg-card text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="all">All People</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value as any)}
        className="px-3 py-1.5 rounded border border-border bg-card text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="critical_first">Sort: Critical First</option>
        <option value="progress_asc">Sort: Progress ↑</option>
        <option value="progress_desc">Sort: Progress ↓</option>
        <option value="deadline_asc">Sort: Deadline ↑</option>
      </select>

      <div className="flex-1" />

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 pr-3 py-1.5 rounded border border-border bg-card text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 w-48"
        />
      </div>
    </div>
  )
}
