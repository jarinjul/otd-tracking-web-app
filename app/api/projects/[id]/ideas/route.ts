import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { pickActiveRelease } from "@/lib/utils/release"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ideas = await prisma.ideaItem.findMany({ where: { release: { projectId: id } }, orderBy: { votes: "desc" } })
  return Response.json(ideas)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const releases = await prisma.release.findMany({ where: { projectId: id }, select: { id: true, status: true, startDate: true } })
  const active = pickActiveRelease(releases)
  if (!active) {
    return Response.json({ error: "This project has no releases yet — create a release before adding ideas." }, { status: 400 })
  }

  const idea = await prisma.ideaItem.create({
    data: { releaseId: active.id, title: body.title, description: body.description ?? "" },
  })
  return Response.json(idea, { status: 201 })
}

// PATCH handles vote and convert actions
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params // consume
  const { id: ideaId, action } = await req.json()

  if (action === "vote") {
    const idea = await prisma.ideaItem.update({
      where: { id: ideaId },
      data: { votes: { increment: 1 } },
    })
    return Response.json(idea)
  }

  if (action === "convert") {
    const idea = await prisma.ideaItem.update({
      where: { id: ideaId },
      data: { status: "approved" },
    })
    return Response.json(idea)
  }

  return Response.json({ error: "Unknown action" }, { status: 400 })
}
