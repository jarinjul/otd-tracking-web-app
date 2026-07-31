import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { WorkspaceClient } from "./WorkspaceClient"

export default async function WorkspaceProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      releases: { include: { ideas: true } },
      teamMembers: { include: { person: true } },
    },
  })

  if (!project) notFound()

  const ideas = project.releases
    .flatMap((r) => r.ideas)
    .sort((a, b) => b.votes - a.votes)

  return <WorkspaceClient project={{ ...project, ideas }} />
}
