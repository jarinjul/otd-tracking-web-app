import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const member = await prisma.projectMember.update({
    where: { id },
    data: {
      projectId: body.projectId,
      personId: body.personId,
      role: body.role,
      responsibilities: body.responsibilities ?? [],
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      allocationPercent: body.allocationPercent != null ? Number(body.allocationPercent) : null,
    },
    include: {
      project: { select: { id: true, name: true } },
      person: { select: { id: true, name: true } },
    },
  })
  return Response.json(member)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.projectMember.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
