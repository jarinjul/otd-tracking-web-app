import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const members = await prisma.projectMember.findMany({
    include: {
      project: { select: { id: true, name: true } },
      person: { select: { id: true, name: true } },
    },
    orderBy: [{ project: { name: "asc" } }, { person: { name: "asc" } }],
  })
  return Response.json(members)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const member = await prisma.projectMember.create({
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
  return Response.json(member, { status: 201 })
}
