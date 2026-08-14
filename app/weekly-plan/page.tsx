import { prisma } from "@/lib/prisma"
import { WeeklyPlanClient } from "./WeeklyPlanClient"

export const metadata = { title: "Weekly Plan — Zenith Hub" }
export const dynamic = "force-dynamic"

export default async function WeeklyPlanPage() {
  const [projects, nextSteps, people, interrupts] = await Promise.all([
    prisma.project.findMany({
      include: {
        releases: { orderBy: { startDate: "desc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.nextStep.findMany({
      where: { done: false },
      include: { release: { select: { project: { select: { id: true, name: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.person.findMany({
      include: { memberships: { select: { allocationPercent: true, startDate: true, endDate: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.interruptTask.findMany({
      select: { id: true, date: true, hours: true, source: true, person: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
  ])

  const flatNextSteps = nextSteps.map((s: any) => ({ ...s, project: s.release.project }))

  return (
    <WeeklyPlanClient
      projects={projects as any}
      nextSteps={flatNextSteps as any}
      people={people as any}
      interrupts={interrupts as any}
    />
  )
}
