"use client"

import { useRef, useState } from "react"
import { ReportView } from "@/components/report/ReportView"
import { ExportActions } from "@/components/report/ExportActions"
import { WeeklyReportTab } from "@/components/report/WeeklyReportTab"
import { MonthlyReportTab } from "@/components/report/MonthlyReportTab"
import type { ProjectWithRelations } from "@/lib/types"

type Tab = "current" | "weekly" | "monthly"
const TABS: { key: Tab; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
]

export function ReportClient({ projects }: { projects: ProjectWithRelations[] }) {
  const printRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<Tab>("current")

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Report View</h1>
          <p className="text-text-muted mt-1">Executive summary for management reporting.</p>
        </div>
        {tab === "current" && (
          <div className="no-print">
            <ExportActions printRef={printRef} projects={projects} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: "var(--color-border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "current" && (
        <div ref={printRef} className="max-w-4xl">
          <ReportView projects={projects} preparedBy="Jarin Chulabutr" />
        </div>
      )}
      {tab === "weekly" && <WeeklyReportTab />}
      {tab === "monthly" && <MonthlyReportTab />}
    </div>
  )
}
