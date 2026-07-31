import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const idea = await prisma.ideaItem.update({
    where: { id },
    data: {
      releaseId: body.releaseId,
      title: body.title,
      description: body.description ?? "",
      votes: body.votes != null ? Number(body.votes) : 0,
      status: body.status,
    },
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
  })
  return Response.json(idea)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.ideaItem.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
