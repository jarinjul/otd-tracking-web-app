"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { IdeaSandbox } from "@/components/workspace/IdeaSandbox"
import { PRDEditor } from "@/components/workspace/PRDEditor"
import { RAGBadge } from "@/components/ui/RAGBadge"
import { PhaseBadge } from "@/components/ui/PhaseBadge"
import { ChevronLeft, Lightbulb, FileText } from "lucide-react"
import type { IdeaItem } from "@/lib/types"

interface WorkspaceProject {
  id: string
  name: string
  ragStatus: any
  phase: any
  prdContent: string | null
  ideas: IdeaItem[]
}

export function WorkspaceClient({ project }: { project: WorkspaceProject }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"sandbox" | "prd">("sandbox")
  const [ideas, setIdeas] = useState<IdeaItem[]>(project.ideas)

  async function refreshIdeas() {
    const res = await fetch(`/api/projects/${project.id}/ideas`)
    setIdeas(await res.json())
  }

  function handleSignOff() {
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-3">
        <Link href="/workspace" className="flex items-center gap-1 text-text-muted hover:text-accent text-sm transition-colors">
          <ChevronLeft size={15} />
          Workspace
        </Link>
        <span className="text-text-muted">/</span>
        <span className="font-semibold text-text-primary">{project.name}</span>
        <RAGBadge status={project.ragStatus} showLabel={false} />
        <PhaseBadge phase={project.phase} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 px-6 border-b border-border bg-card">
        {[
          { id: "sandbox" as const, label: "💡 Idea Sandbox",   Icon: Lightbulb },
          { id: "prd"     as const, label: "📄 PRD Document",   Icon: FileText  },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {activeTab === "sandbox" ? (
            <IdeaSandbox ideas={ideas} projectId={project.id} onRefresh={refreshIdeas} />
          ) : (
            <PRDEditor
              projectId={project.id}
              initialContent={project.prdContent ?? ""}
              onSignOff={handleSignOff}
            />
          )}
        </div>
      </div>
    </div>
  )
}
