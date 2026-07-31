"use client"

import { ThumbsUp, CheckCircle, XCircle, Clock, Lightbulb } from "lucide-react"
import type { IdeaItem, IdeaStatus } from "@/lib/types"

const STATUS_CONFIG: Record<IdeaStatus, { label: string; bg: string; text: string; Icon: any }> = {
  draft:     { label: "Draft",     bg: "bg-gray-100",          text: "text-text-muted",     Icon: Lightbulb   },
  reviewing: { label: "Reviewing", bg: "bg-rag-amber-light",   text: "text-rag-amber-text", Icon: Clock       },
  approved:  { label: "Approved",  bg: "bg-rag-green-light",   text: "text-rag-green-text", Icon: CheckCircle },
  rejected:  { label: "Rejected",  bg: "bg-rag-red-light",     text: "text-rag-red-text",   Icon: XCircle     },
}

interface IdeaCardProps {
  idea: IdeaItem
  onVote: (id: string) => void
  onConvert: (id: string) => void
}

export function IdeaCard({ idea, onVote, onConvert }: IdeaCardProps) {
  const s = STATUS_CONFIG[idea.status]

  return (
    <div className="bg-card border border-border rounded-card p-4 flex gap-3 hover:shadow-sm transition-shadow">
      {/* Vote button */}
      <button
        onClick={() => onVote(idea.id)}
        className="flex flex-col items-center gap-1 text-text-muted hover:text-accent transition-colors shrink-0"
      >
        <ThumbsUp size={16} />
        <span className="text-xs font-bold">{idea.votes}</span>
      </button>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-sm font-semibold text-text-primary">{idea.title}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-badge font-medium shrink-0 ${s.bg} ${s.text}`}>
            {s.label}
          </span>
        </div>
        <p className="text-xs text-text-muted mb-3">{idea.description}</p>
        {(idea.status === "approved" || idea.status === "reviewing") && (
          <button
            onClick={() => onConvert(idea.id)}
            className="text-xs text-accent hover:underline font-medium"
          >
            Convert → PRD Requirement
          </button>
        )}
      </div>
    </div>
  )
}
