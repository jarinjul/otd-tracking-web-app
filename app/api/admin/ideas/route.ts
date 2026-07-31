import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const ideas = await prisma.ideaItem.findMany({
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
    orderBy: [{ createdAt: "asc" }],
  })
  return Response.json(ideas)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const idea = await prisma.ideaItem.create({
    data: {
      releaseId: body.releaseId,
      title: body.title,
      description: body.description ?? "",
      votes: body.votes != null ? Number(body.votes) : 0,
      status: body.status ?? "draft",
    },
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
  })
  return Response.json(idea, { status: 201 })
}
