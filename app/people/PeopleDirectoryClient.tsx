"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { PersonCard } from "@/components/people/PersonCard"
import { computePersonFocus, monthKey } from "@/lib/utils/workload"
import type { PersonWithMemberships, ProjectWithRelations } from "@/lib/types"

interface PeopleDirectoryClientProps {
  people: PersonWithMemberships[]
  projects: ProjectWithRelations[]
}

export function PeopleDirectoryClient({ people, projects }: PeopleDirectoryClientProps) {
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [activeOnly, setActiveOnly] = useState(false)
  const [overloadedOnly, setOverloadedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "workload">("name")

  const currentMonth = useMemo(() => monthKey(new Date()), [])

  const departments = useMemo(() => {
    const depts = Array.from(new Set(people.map((p) => p.department).filter(Boolean))) as string[]
    return depts.sort()
  }, [people])

  // Compute once per person — reused for the summary strip, the overloaded filter, and workload sort.
  const focusByPerson = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computePersonFocus>>()
    for (const p of people) map.set(p.id, computePersonFocus(p, projects, currentMonth))
    return map
  }, [people, projects, currentMonth])

  const filtered = useMemo(() => {
    let list = people.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (deptFilter !== "all" && p.department !== deptFilter) return false
      if (activeOnly) {
        const hasActive = projects.some(
          (proj) => proj.phase !== "completed" && proj.teamMembers.some((m) => m.personId === p.id)
        )
        if (!hasActive) return false
      }
      if (overloadedOnly && (focusByPerson.get(p.id)?.pct ?? 0) <= 110) return false
      return true
    })
    if (sortBy === "workload") {
      list = [...list].sort((a, b) => (focusByPerson.get(b.id)?.pct ?? 0) - (focusByPerson.get(a.id)?.pct ?? 0))
    }
    return list
  }, [people, projects, search, deptFilter, activeOnly, overloadedOnly, sortBy, focusByPerson])

  const teamStats = useMemo(() => {
    const values = filtered.map((p) => focusByPerson.get(p.id)?.pct ?? 0)
    const avg = values.length > 0 ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : 0
    const overloaded = values.filter((v) => v > 110).length
    const bench = filtered.filter((p) => (focusByPerson.get(p.id)?.totalHours ?? 0) === 0).length
    return { avg, overloaded, bench }
  }, [filtered, focusByPerson])

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">People & Responsibility Hub</h1>
        <p className="text-text-muted mt-1">Directory of all team members and their project assignments.</p>
      </div>

      {/* Team summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Team avg workload (this month)</p>
          <p className="text-xl font-semibold text-text-primary">{teamStats.avg}%</p>
        </div>
        <div className="bg-surface rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Overloaded (&gt;110%)</p>
          <p className="text-xl font-semibold text-rag-red">{teamStats.overloaded} คน</p>
        </div>
        <div className="bg-surface rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Bench (ว่างเดือนนี้)</p>
          <p className="text-xl font-semibold text-accent">{teamStats.bench} คน</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="pl-8 pr-3 py-1.5 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 w-52"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-1.5 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "workload")}
          className="px-3 py-1.5 rounded border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="name">Sort: Name</option>
          <option value="workload">Sort: Workload (highest first)</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="accent-accent"
          />
          Active Projects Only
        </label>

        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={overloadedOnly}
            onChange={(e) => setOverloadedOnly(e.target.checked)}
            className="accent-accent"
          />
          Overloaded Only
        </label>

        <span className="text-sm text-text-muted ml-auto">{filtered.length} people</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((person) => (
          <PersonCard key={person.id} person={person} projects={projects} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-text-muted">
            No people match the current filters.
          </div>
        )}
      </div>
    </div>
  )
}
