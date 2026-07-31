import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.subtitle !== undefined) data.subtitle = body.subtitle || null
  if (body.note !== undefined) data.note = body.note || null
  if (body.projectName !== undefined) data.projectName = body.projectName || null
  if (body.owner !== undefined) data.owner = body.owner || null
  if (body.status !== undefined) data.status = body.status

  const item = await prisma.weekPlanItem.update({ where: { id }, data })
  return Response.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.weekPlanItem.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
