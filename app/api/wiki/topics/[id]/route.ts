import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) return Response.json({ error: "title cannot be empty" }, { status: 400 })
    data.title = title
  }
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)

  const topic = await prisma.wikiTopic.update({
    where: { id },
    data,
    include: { entries: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  })
  return Response.json(topic)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.wikiTopic.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
