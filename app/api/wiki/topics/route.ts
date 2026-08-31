import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const ENTRY_ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }]
const TOPIC_ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }]

export async function GET() {
  const topics = await prisma.wikiTopic.findMany({
    include: { entries: { orderBy: ENTRY_ORDER } },
    orderBy: TOPIC_ORDER,
  })
  return Response.json(topics)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const title = String(body.title ?? "").trim()
  if (!title) return Response.json({ error: "title is required" }, { status: 400 })

  const count = await prisma.wikiTopic.count()
  const topic = await prisma.wikiTopic.create({
    data: { title, sortOrder: count },
    include: { entries: { orderBy: ENTRY_ORDER } },
  })
  return Response.json(topic, { status: 201 })
}
