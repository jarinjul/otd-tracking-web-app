import { prisma } from "@/lib/prisma"
import { GanttControls } from "@/components/gantt/GanttControls"
import { GanttView } from "@/components/gantt/GanttView"

export const dynamic = "force-dynamic"

export default async function GanttPage() {
  const projects = await prisma.project.findMany({
    include: {
      teamMembers: { include: { person: true } },
      releases: {
        orderBy: { startDate: "asc" as const },
        include: { ideas: true, blockers: true, nextSteps: true, risks: true },
      },
    },
    orderBy: { startDate: "asc" },
  })

  const people = await prisma.person.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })

  return (
    <div className="flex flex-col h-full">
      <GanttControls people={people} />
      <GanttView projects={projects as any} />
    </div>
  )
}
