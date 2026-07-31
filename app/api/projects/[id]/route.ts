import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const INCLUDE_ALL = {
  teamMembers: { include: { person: true } },
  releases: {
    orderBy: { releaseDate: "desc" as const },
    include: { ideas: true, blockers: true, nextSteps: true, risks: true },
  },
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id }, include: INCLUDE_ALL })
  if (!project) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json(project)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = { ...body }
  if (body.startDate) data.startDate = new Date(body.startDate)
  if (body.deadline)  data.deadline  = new Date(body.deadline)
  if (body.nextMilestoneDate) data.nextMilestoneDate = new Date(body.nextMilestoneDate)

  const project = await prisma.project.update({ where: { id }, data, include: INCLUDE_ALL })
  return Response.json(project)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.project.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
