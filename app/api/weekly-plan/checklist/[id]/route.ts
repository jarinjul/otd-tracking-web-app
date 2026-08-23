import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.text !== undefined) data.text = body.text
  if (body.done !== undefined) data.done = body.done

  const item = await prisma.weekPlanChecklistItem.update({ where: { id }, data })
  return Response.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.weekPlanChecklistItem.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
