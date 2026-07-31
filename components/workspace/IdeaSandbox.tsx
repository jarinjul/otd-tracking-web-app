"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { IdeaCard } from "@/components/workspace/IdeaCard"
import type { IdeaItem } from "@/lib/types"

interface IdeaSandboxProps {
  ideas: IdeaItem[]
  projectId: string
  onRefresh: () => void
}

export function IdeaSandbox({ ideas, projectId, onRefresh }: IdeaSandboxProps) {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleVote(id: string) {
    await fetch(`/api/projects/${projectId}/ideas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "vote" }),
    })
    onRefresh()
  }

  async function handleConvert(id: string) {
    await fetch(`/api/projects/${projectId}/ideas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "convert" }),
    })
    onRefresh()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await fetch(`/api/projects/${projectId}/ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: desc.trim() }),
    })
    setTitle("")
    setDesc("")
    setAdding(false)
    setLoading(false)
    onRefresh()
  }

  const sorted = [...ideas].sort((a, b) => b.votes - a.votes)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">💡 Feature Sandbox</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <Plus size={14} /> Add idea
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-accent-light border border-accent/30 rounded-card p-4 flex flex-col gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Idea title..."
            className="px-3 py-1.5 rounded border border-border text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)..."
            rows={2}
            className="px-3 py-1.5 rounded border border-border text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-50">
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onVote={handleVote} onConvert={handleConvert} />
        ))}
        {ideas.length === 0 && (
          <p className="text-sm text-text-muted italic text-center py-6">No ideas yet. Be the first to add one!</p>
        )}
      </div>
    </div>
  )
}
