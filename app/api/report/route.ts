import { prisma } from "@/lib/prisma"

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      teamMembers: { include: { person: true } },
      releases: { include: { ideas: true, blockers: true, nextSteps: true, risks: true } },
    },
    orderBy: [
      { needsDecision: "desc" },
      { ragStatus: "asc" },
    ],
  })
  return Response.json(projects)
}
