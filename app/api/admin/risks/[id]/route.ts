import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const risk = await prisma.risk.update({
    where: { id },
    data: {
      releaseId: body.releaseId,
      description: body.description,
      likelihood: body.likelihood,
      impact: body.impact,
      mitigation: body.mitigation || null,
    },
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
  })
  return Response.json(risk)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.risk.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
