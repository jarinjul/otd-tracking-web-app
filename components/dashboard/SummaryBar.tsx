"use client"

import { useDashboardStore } from "@/lib/stores/dashboardStore"
import type { RagStatus, FilterStatus } from "@/lib/types"

interface SummaryBarProps {
  total: number
  green: number
  amber: number
  red: number
}

interface StatCardProps {
  label: string
  value: number
  dot?: string
  status?: FilterStatus
  active: boolean
  onClick: () => void
  borderColor: string
}

function StatCard({ label, value, dot, active, onClick, borderColor }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col gap-1 px-5 py-4 rounded-card bg-card border-2 text-left transition-all ${
        active ? `${borderColor} shadow-md` : "border-transparent hover:border-gray-200"
      }`}
      style={{ boxShadow: active ? undefined : "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
        {dot && <span className="mr-1">{dot}</span>}{label}
      </span>
      <span className="text-3xl font-bold text-text-primary">{value}</span>
    </button>
  )
}

export function SummaryBar({ total, green, amber, red }: SummaryBarProps) {
  const { filterStatus, setFilterStatus } = useDashboardStore()

  const toggle = (s: FilterStatus) => setFilterStatus(filterStatus === s ? "all" : s)

  return (
    <div className="flex gap-4 px-6 py-4">
      <StatCard
        label="Total in Group" value={total}
        active={filterStatus === "all"} onClick={() => setFilterStatus("all")}
        borderColor="border-accent"
      />
      <StatCard
        label="On Track" value={green} dot="🟢"
        active={filterStatus === "green"} onClick={() => toggle("green")}
        borderColor="border-rag-green"
      />
      <StatCard
        label="At Risk" value={amber} dot="🟡"
        active={filterStatus === "amber"} onClick={() => toggle("amber")}
        borderColor="border-rag-amber"
      />
      <StatCard
        label="Critical / Blocked" value={red} dot="🔴"
        active={filterStatus === "red"} onClick={() => toggle("red")}
        borderColor="border-rag-red"
      />
    </div>
  )
}
