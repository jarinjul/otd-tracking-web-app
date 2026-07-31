import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const blockers = await prisma.blocker.findMany({
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
    orderBy: [{ createdAt: "asc" }],
  })
  return Response.json(blockers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const blocker = await prisma.blocker.create({
    data: {
      releaseId: body.releaseId,
      description: body.description,
      severity: body.severity,
      owner: body.owner,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
  })
  return Response.json(blocker, { status: 201 })
}
