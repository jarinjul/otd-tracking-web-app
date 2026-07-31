import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { RAGBadge } from "@/components/ui/RAGBadge"
import { PhaseBadge } from "@/components/ui/PhaseBadge"
import { FileText, ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function WorkspacePage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ strategicBucket: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, strategicBucket: true,
      ragStatus: true, phase: true, progressPercent: true,
      releases: { select: { _count: { select: { ideas: true } } } },
    },
  })
  const ideaCount = (p: (typeof projects)[number]) => p.releases.reduce((sum, r) => sum + r._count.ideas, 0)

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Pre-Dev Workspace & PRD Center</h1>
        <p className="text-text-muted mt-1">Select a project to open its Idea Sandbox and PRD document.</p>
      </div>

      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/workspace/${p.id}`}
            className="flex items-center gap-4 bg-card border border-border rounded-card px-5 py-4 hover:border-accent hover:shadow-sm transition-all group"
          >
            <FileText size={18} className="text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">{p.name}</span>
                <RAGBadge status={p.ragStatus as any} showLabel={false} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <PhaseBadge phase={p.phase as any} />
                <span className="text-xs text-text-muted">{ideaCount(p)} ideas</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-text-muted group-hover:text-accent transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
