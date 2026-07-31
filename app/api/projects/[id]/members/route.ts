import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const member = await prisma.projectMember.create({
    data: {
      projectId: id,
      personId: body.personId,
      role: body.role,
      responsibilities: body.responsibilities ?? [],
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      allocationPercent: body.allocationPercent,
    },
    include: { person: true },
  })
  return Response.json(member, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  const { memberId } = await req.json()
  await prisma.projectMember.delete({ where: { id: memberId } })
  return new Response(null, { status: 204 })
}
