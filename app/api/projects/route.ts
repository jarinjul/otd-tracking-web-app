import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const INCLUDE_ALL = {
  teamMembers: { include: { person: true } },
  releases: {
    orderBy: { releaseDate: "desc" as const },
    include: { ideas: true, blockers: true, nextSteps: true, risks: true },
  },
}

export async function GET(req: NextRequest) {
  const group = req.nextUrl.searchParams.get("group")
  const projects = await prisma.project.findMany({
    where: group ? { strategicBucket: group } : undefined,
    include: INCLUDE_ALL,
    orderBy: { createdAt: "asc" },
  })
  return Response.json(projects)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const project = await prisma.project.create({
    data: {
      ...body,
      // startDate/deadline are no longer collected in the admin form — the
      // meaningful timeline now lives per-Release. Default silently so the
      // required DB columns stay populated.
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      deadline: body.deadline ? new Date(body.deadline) : new Date(Date.now() + 90 * 86400000),
      nextMilestoneDate: body.nextMilestoneDate ? new Date(body.nextMilestoneDate) : null,
    },
    include: INCLUDE_ALL,
  })
  return Response.json(project, { status: 201 })
}
