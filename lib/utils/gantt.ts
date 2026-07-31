import type { ProjectWithRelations } from "@/lib/types"
import { RAG_COLORS } from "@/lib/types"

export function getBarStyle(
  project: { startDate: Date; deadline: Date; ragStatus: keyof typeof RAG_COLORS },
  viewStart: Date,
  totalDays: number
): React.CSSProperties {
  const start = Math.max(
    0,
    Math.round((new Date(project.startDate).getTime() - viewStart.getTime()) / 86400000)
  )
  const end = Math.round(
    (new Date(project.deadline).getTime() - viewStart.getTime()) / 86400000
  )
  const duration = Math.max(1, end - start)

  return {
    left: `${(start / totalDays) * 100}%`,
    width: `${(duration / totalDays) * 100}%`,
    backgroundColor: RAG_COLORS[project.ragStatus],
  }
}

export function getRangeBarStyle(
  start: Date | string,
  end: Date | string,
  viewStart: Date,
  totalDays: number
): { left: string; width: string } {
  const startDays = Math.round((new Date(start).getTime() - viewStart.getTime()) / 86400000)
  const endDays = Math.round((new Date(end).getTime() - viewStart.getTime()) / 86400000)
  const duration = Math.max(1, endDays - startDays)

  return {
    left: `${(startDays / totalDays) * 100}%`,
    width: `${(duration / totalDays) * 100}%`,
  }
}

export function getMilestoneLeft(
  date: Date | string,
  viewStart: Date,
  totalDays: number
): string {
  const d = new Date(date)
  const days = Math.round((d.getTime() - viewStart.getTime()) / 86400000)
  return `${(days / totalDays) * 100}%`
}

export function getTodayLeft(viewStart: Date, totalDays: number): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((today.getTime() - viewStart.getTime()) / 86400000)
  if (days < 0 || days > totalDays) return "-1000px"
  return `${(days / totalDays) * 100}%`
}

export function filterByPerson(
  projects: ProjectWithRelations[],
  personId: string
): ProjectWithRelations[] {
  return projects.filter((p) =>
    p.teamMembers.some((m) => m.personId === personId)
  )
}
