import { prisma } from "@/lib/prisma"
import { ResourcePlanningClient } from "./ResourcePlanningClient"

export const metadata = { title: "Resource Planning — Nexus Hub" }
export const dynamic = "force-dynamic"

// Fetch generously beyond the max 6-month view range so the start-month picker can still show a
// full 3/6-month window even when shifted a few months forward.
const FETCH_MONTHS_AHEAD = 12

export default async function ResourcePlanningPage() {
  const now = new Date()
  const rangeStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const rangeEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + FETCH_MONTHS_AHEAD, 1))

  const [people, projects, interrupts, memberships] = await Promise.all([
    prisma.person.findMany({
      select: { id: true, name: true, avatarUrl: true, monthlyCapacityHours: true, roles: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        releases: {
          select: {
            id: true,
            version: true,
            status: true,
            startDate: true,
            endDate: true,
            workloadEntries: {
              where: { month: { gte: rangeStart, lt: rangeEnd } },
              select: { personId: true, month: true, hours: true },
            },
          },
          orderBy: { startDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.interruptTask.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd } },
      select: { personId: true, date: true, hours: true },
    }),
    prisma.projectMember.findMany({
      select: { personId: true, projectId: true },
    }),
  ])

  return <ResourcePlanningClient people={people} projects={projects} interrupts={interrupts} memberships={memberships} />
}
