import type { ProjectWithRelations } from "@/lib/types"

export function getProjectsByPerson(projects: ProjectWithRelations[], personId: string) {
  return projects
    .filter((p) => p.teamMembers.some((m) => m.personId === personId))
    .map((p) => ({
      project: p,
      membership: p.teamMembers.find((m) => m.personId === personId)!,
    }))
}

export function getTotalAllocation(projects: ProjectWithRelations[], personId: string): number {
  return getProjectsByPerson(projects, personId)
    .filter(({ membership }) => !membership.endDate)
    .reduce((sum, { membership }) => sum + (membership.allocationPercent ?? 0), 0)
}

export function getActiveProjectCount(projects: ProjectWithRelations[], personId: string): number {
  return getProjectsByPerson(projects, personId).filter(
    ({ project }) => project.phase !== "completed"
  ).length
}
