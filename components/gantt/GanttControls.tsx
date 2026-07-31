"use client"

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { useGanttStore } from "@/lib/stores/ganttStore"
import { BUCKET_KEYS, BUCKET_SHORT_LABELS } from "@/lib/types"
import { ganttMonthLabel } from "@/lib/utils/date"
import type { Person } from "@/lib/types"

interface GanttControlsProps {
  people: Pick<Person, "id" | "name">[]
}

export function GanttControls({ people }: GanttControlsProps) {
  const {
    viewMode, groupFilter, personFilter, viewStart,
    setViewMode, setGroupFilter, setPersonFilter,
    navigateBack, navigateForward, goToToday,
  } = useGanttStore()

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-card border-b border-border">
      {/* Bucket filter */}
      <select
        value={groupFilter}
        onChange={(e) => setGroupFilter(e.target.value)}
        className="px-3 py-1.5 rounded border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="all">Bucket: All</option>
        {BUCKET_KEYS.map((k) => <option key={k} value={k}>{BUCKET_SHORT_LABELS[k]}</option>)}
      </select>

      {/* Person filter */}
      <select
        value={personFilter}
        onChange={(e) => setPersonFilter(e.target.value)}
        className="px-3 py-1.5 rounded border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="all">Person: All</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* View mode */}
      <div className="flex rounded border border-border overflow-hidden bg-surface text-sm">
        {(["day", "week", "month"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={`px-3 py-1.5 capitalize transition-colors ${viewMode === m ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100"}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1 ml-4">
        <button onClick={navigateBack} className="p-1.5 rounded hover:bg-gray-100 text-text-muted transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-sm font-medium text-text-primary min-w-32 text-center">
          {ganttMonthLabel(viewStart)}
        </span>
        <button onClick={navigateForward} className="p-1.5 rounded hover:bg-gray-100 text-text-muted transition-colors"><ChevronRight size={16} /></button>
      </div>

      <button
        onClick={goToToday}
        className="ml-1 flex items-center gap-1 px-3 py-1.5 rounded border border-accent text-accent text-sm hover:bg-accent-light transition-colors"
      >
        <CalendarDays size={14} />
        Today
      </button>
    </div>
  )
}
