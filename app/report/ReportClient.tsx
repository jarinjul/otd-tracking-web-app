"use client"

import { useRef } from "react"
import { ReportView } from "@/components/report/ReportView"
import { ExportActions } from "@/components/report/ExportActions"
import type { ProjectWithRelations } from "@/lib/types"

export function ReportClient({ projects }: { projects: ProjectWithRelations[] }) {
  const printRef = useRef<HTMLDivElement>(null)

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Report View</h1>
          <p className="text-text-muted mt-1">Executive summary for management reporting.</p>
        </div>
        <div className="no-print">
          <ExportActions printRef={printRef} projects={projects} />
        </div>
      </div>

      <div ref={printRef} className="max-w-4xl">
        <ReportView projects={projects} preparedBy="Jarin Chulabutr" />
      </div>
    </div>
  )
}
