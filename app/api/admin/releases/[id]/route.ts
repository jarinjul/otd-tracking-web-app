import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const release = await prisma.release.update({
    where: { id },
    data: {
      projectId: body.projectId,
      version: body.version,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
      status: body.status ?? "planned",
      features: body.features ?? [],
      deployNote: body.deployNote || null,
      releaseNotes: body.releaseNotes || null,
      ragStatus: body.ragStatus ?? "green",
      phase: body.phase ?? "ideation",
      progressPercent: body.progressPercent != null ? Number(body.progressPercent) : 0,
      isDelayed: body.isDelayed ?? false,
      delayDays: body.delayDays ?? null,
      needsDecision: body.needsDecision ?? false,
      decisionNote: body.decisionNote || null,
      devEntries: body.devEntries ?? [],
      aiEntries: body.aiEntries ?? [],
      vendorName: body.vendorName || null,
      vendorCost: body.vendorCost ?? null,
      vendorTimeDays: body.vendorTimeDays ?? null,
    },
    include: { project: { select: { id: true, name: true } } },
  })
  return Response.json(release)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.release.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
