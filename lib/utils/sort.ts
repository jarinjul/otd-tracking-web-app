import type { ProjectWithRelations } from "@/lib/types"
import { worstRagStatus } from "@/lib/utils/rag"

const RAG_ORDER = { red: 0, amber: 1, green: 2 }

export function defaultSort(projects: ProjectWithRelations[]): ProjectWithRelations[] {
  return [...projects].sort((a, b) => {
    // RAG: red → amber → green, using the worst status across each project's releases
    return RAG_ORDER[worstRagStatus(a)] - RAG_ORDER[worstRagStatus(b)]
  })
}
