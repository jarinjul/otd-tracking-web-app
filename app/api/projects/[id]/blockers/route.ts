import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { pickActiveRelease } from "@/lib/utils/release"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const releases = await prisma.release.findMany({ where: { projectId: id }, select: { id: true, status: true, startDate: true } })
  const active = pickActiveRelease(releases)
  if (!active) {
    return Response.json({ error: "This project has no releases yet — create a release before adding blockers." }, { status: 400 })
  }

  const blocker = await prisma.blocker.create({
    data: {
      releaseId: active.id,
      description: body.description,
      severity: body.severity,
      owner: body.owner,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
  })
  return Response.json(blocker, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  const { blockerId } = await req.json()
  await prisma.blocker.delete({ where: { id: blockerId } })
  return new Response(null, { status: 204 })
}
