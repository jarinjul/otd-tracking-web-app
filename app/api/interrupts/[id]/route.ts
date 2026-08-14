import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseDateParamUTC } from "@/lib/utils/date"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.date !== undefined) data.date = parseDateParamUTC(String(body.date))
  if (body.personId !== undefined) data.personId = String(body.personId)
  if (body.hours !== undefined) data.hours = Number(body.hours)
  if (body.source !== undefined) data.source = String(body.source).trim()
  if (body.projectId !== undefined) data.projectId = body.projectId ? String(body.projectId) : null
  if (body.note !== undefined) data.note = body.note ? String(body.note) : null

  const entry = await prisma.interruptTask.update({
    where: { id },
    data,
    include: { person: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
  })
  return Response.json(entry)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.interruptTask.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
