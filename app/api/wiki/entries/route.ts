import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

// ~2MB of HTML text. The sample "Zenith Hub.html" is ~430KB, so this leaves
// generous headroom while keeping a single row from blowing up.
const MAX_HTML_LENGTH = 2_000_000

export async function POST(req: NextRequest) {
  const body = await req.json()
  const topicId = String(body.topicId ?? "")
  const title = String(body.title ?? "").trim()
  const html = String(body.html ?? "")
  const sourceName = body.sourceName ? String(body.sourceName) : null

  if (!topicId || !title || !html.trim()) {
    return Response.json({ error: "topicId, title and html are required" }, { status: 400 })
  }
  if (html.length > MAX_HTML_LENGTH) {
    return Response.json({ error: "HTML file too large (max ~2MB)" }, { status: 400 })
  }

  const topic = await prisma.wikiTopic.findUnique({ where: { id: topicId }, select: { id: true } })
  if (!topic) return Response.json({ error: "topic not found" }, { status: 404 })

  const count = await prisma.wikiEntry.count({ where: { topicId } })
  const entry = await prisma.wikiEntry.create({
    data: { topicId, title, html, sourceName, sortOrder: count },
  })
  return Response.json(entry, { status: 201 })
}
