import { prisma } from "@/lib/prisma"
import { PeopleDirectoryClient } from "./PeopleDirectoryClient"

export const dynamic = "force-dynamic"

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    include: { memberships: { include: { project: true } } },
    orderBy: { name: "asc" },
  })

  const projects = await prisma.project.findMany({
    include: {
      teamMembers: { include: { person: true } },
      releases: { include: { ideas: true, blockers: true, nextSteps: true, risks: true, workloadEntries: true } },
    },
  })

  return <PeopleDirectoryClient people={people as any} projects={projects as any} />
}
