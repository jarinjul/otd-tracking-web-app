import { prisma } from "@/lib/prisma"
import { DashboardClient } from "./DashboardClient"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [projects, people, workloadEntries, interrupts] = await Promise.all([
    prisma.project.findMany({
      include: {
        teamMembers: { include: { person: true } },
        releases: {
          orderBy: { releaseDate: "desc" as const },
          include: { ideas: true, blockers: true, nextSteps: true, risks: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.person.findMany({
      select: { id: true, name: true, avatarUrl: true, monthlyCapacityHours: true },
      orderBy: { name: "asc" },
    }),
    prisma.releaseWorkload.findMany({
      select: { releaseId: true, personId: true, month: true, hours: true },
    }),
    prisma.interruptTask.findMany({
      select: { date: true, hours: true },
    }),
  ])

  return (
    <DashboardClient
      projects={projects as any}
      people={people}
      workloadEntries={workloadEntries}
      interrupts={interrupts}
    />
  )
}
