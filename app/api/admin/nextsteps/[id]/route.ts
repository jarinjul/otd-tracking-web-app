import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const step = await prisma.nextStep.update({
    where: { id },
    data: {
      releaseId: body.releaseId,
      description: body.description,
      owner: body.owner,
      dueDate: new Date(body.dueDate),
      done: body.done ?? false,
      priority: body.priority ?? "medium",
      effortDays: body.effortDays ?? null,
    },
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
  })
  return Response.json(step)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.nextStep.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
