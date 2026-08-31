import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const MAX_HTML_LENGTH = 2_000_000

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) return Response.json({ error: "title cannot be empty" }, { status: 400 })
    data.title = title
  }
  if (body.html !== undefined) {
    const html = String(body.html)
    if (!html.trim()) return Response.json({ error: "html cannot be empty" }, { status: 400 })
    if (html.length > MAX_HTML_LENGTH) {
      return Response.json({ error: "HTML file too large (max ~2MB)" }, { status: 400 })
    }
    data.html = html
  }
  if (body.sourceName !== undefined) data.sourceName = body.sourceName ? String(body.sourceName) : null
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)

  const entry = await prisma.wikiEntry.update({ where: { id }, data })
  return Response.json(entry)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.wikiEntry.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
