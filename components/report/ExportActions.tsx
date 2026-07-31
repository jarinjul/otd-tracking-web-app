"use client"

import { useRef, useState } from "react"
import { useReactToPrint } from "react-to-print"
import { Printer, Copy, CheckCheck } from "lucide-react"
import type { ProjectWithRelations } from "@/lib/types"
import { BUCKET_LABELS, PHASE_LABELS } from "@/lib/types"
import { formatDate, formatDateShort, countdownLabel } from "@/lib/utils/date"

interface ExportActionsProps {
  printRef: React.RefObject<HTMLDivElement | null>
  projects: ProjectWithRelations[]
}

export function ExportActions({ printRef, projects }: ExportActionsProps) {
  const [copied, setCopied] = useState(false)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Zenith Status Report — ${new Date().toLocaleDateString()}`,
    pageStyle: "@page { margin: 20mm; }",
  })

  function buildMarkdown(): string {
    const lines: string[] = [
      `# PROJECT STATUS REPORT`,
      `Date: ${formatDate(new Date())}`,
      "",
      "## EXECUTIVE SUMMARY",
    ]
    const decisions = projects.filter((p) => p.needsDecision)
    if (decisions.length > 0) {
      lines.push("", "### Management Action Required")
      decisions.forEach((p) => lines.push(`- **${p.name}**: ${p.decisionNote}`))
    }
    lines.push("", "## PROJECT SUMMARIES")
    projects.forEach((p) => {
      const pm = p.teamMembers.find((m) => m.role === "ProjectManager")
      lines.push(
        "",
        `### [${p.ragStatus.toUpperCase()}] ${p.name} (${BUCKET_LABELS[(p as any).strategicBucket ?? ""] ?? "—"})`,
        `- PM: ${pm?.person.name ?? "—"} | Phase: ${PHASE_LABELS[p.phase]} | Progress: ${p.progressPercent}%`,
        `- Timeline: ${formatDateShort(p.startDate)} → ${formatDateShort(p.deadline)} — ${countdownLabel(p.deadline)}`,
      )
      const releaseBlockers = (p.releases ?? []).flatMap((r) => r.blockers ?? [])
      const releaseNextSteps = (p.releases ?? []).flatMap((r) => r.nextSteps ?? [])
      if (releaseBlockers.length > 0) lines.push(`- Issue: ${releaseBlockers[0].description}`)
      if (releaseNextSteps.length > 0) lines.push(`- Next: ${releaseNextSteps[0].description} (${releaseNextSteps[0].owner})`)
    })
    return lines.join("\n")
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildMarkdown())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 rounded border border-border bg-card text-sm text-text-primary hover:bg-gray-50 transition-colors"
      >
        {copied ? <CheckCheck size={15} className="text-rag-green" /> : <Copy size={15} />}
        {copied ? "Copied!" : "Copy as Markdown"}
      </button>
      <button
        onClick={() => handlePrint()}
        className="flex items-center gap-2 px-4 py-2 rounded bg-accent text-white text-sm hover:bg-accent-dark transition-colors"
      >
        <Printer size={15} />
        Print / PDF
      </button>
    </div>
  )
}
