import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { pickActiveRelease } from "@/lib/utils/release"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const releases = await prisma.release.findMany({ where: { projectId: id }, select: { id: true, status: true, startDate: true } })
  const active = pickActiveRelease(releases)
  if (!active) {
    return Response.json({ error: "This project has no releases yet — create a release before adding next steps." }, { status: 400 })
  }

  const step = await prisma.nextStep.create({
    data: {
      releaseId: active.id,
      description: body.description,
      owner: body.owner,
      dueDate: new Date(body.dueDate),
    },
  })
  return Response.json(step, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  const { stepId, done } = await req.json()
  const step = await prisma.nextStep.update({ where: { id: stepId }, data: { done } })
  return Response.json(step)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  const { stepId } = await req.json()
  await prisma.nextStep.delete({ where: { id: stepId } })
  return new Response(null, { status: 204 })
}
