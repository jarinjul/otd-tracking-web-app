import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { pickActiveRelease } from "@/lib/utils/release"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const releases = await prisma.release.findMany({ where: { projectId: id }, select: { id: true, status: true, startDate: true } })
  const active = pickActiveRelease(releases)
  if (!active) {
    return Response.json({ error: "This project has no releases yet — create a release before adding risks." }, { status: 400 })
  }

  const risk = await prisma.risk.create({
    data: {
      releaseId: active.id,
      description: body.description,
      likelihood: body.likelihood,
      impact: body.impact,
      mitigation: body.mitigation,
    },
  })
  return Response.json(risk, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  const { riskId } = await req.json()
  await prisma.risk.delete({ where: { id: riskId } })
  return new Response(null, { status: 204 })
}
