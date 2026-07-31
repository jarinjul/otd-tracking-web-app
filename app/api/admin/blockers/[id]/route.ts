import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const blocker = await prisma.blocker.update({
    where: { id },
    data: {
      releaseId: body.releaseId,
      description: body.description,
      severity: body.severity,
      owner: body.owner,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
  })
  return Response.json(blocker)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.blocker.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
