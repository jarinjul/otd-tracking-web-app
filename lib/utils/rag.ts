import type { ProjectWithRelations, RagStatus } from "@/lib/types"

const RAG_RANK: Record<RagStatus, number> = { red: 0, amber: 1, green: 2 }

/**
 * Worst (most severe) RAG status across all of this project's releases.
 * Falls back to "green" when there are no releases to judge by.
 */
export function worstRagStatus(project: ProjectWithRelations): RagStatus {
  const releases = project.releases ?? []
  if (releases.length === 0) return "green"
  return releases.reduce<RagStatus>((worst, r) => {
    const rag = r.ragStatus as RagStatus
    return RAG_RANK[rag] < RAG_RANK[worst] ? rag : worst
  }, "green")
}
