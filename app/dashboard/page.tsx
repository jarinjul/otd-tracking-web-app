import { prisma } from "@/lib/prisma"
import { DashboardClient } from "./DashboardClient"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    include: {
      teamMembers: { include: { person: true } },
      releases: {
        orderBy: { releaseDate: "desc" as const },
        include: { ideas: true, blockers: true, nextSteps: true, risks: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const people = await prisma.person.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })

  return <DashboardClient projects={projects as any} people={people} />
}
