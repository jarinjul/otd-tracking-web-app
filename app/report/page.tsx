import { prisma } from "@/lib/prisma"
import { ReportClient } from "./ReportClient"

export const dynamic = "force-dynamic"

export default async function ReportPage() {
  const projects = await prisma.project.findMany({
    include: {
      teamMembers: { include: { person: true } },
      releases: { include: { ideas: true, blockers: true, nextSteps: true, risks: true } },
    },
    orderBy: [{ needsDecision: "desc" }, { ragStatus: "asc" }],
  })

  return <ReportClient projects={projects as any} />
}
