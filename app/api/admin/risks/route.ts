import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const risks = await prisma.risk.findMany({
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
    orderBy: [{ createdAt: "asc" }],
  })
  return Response.json(risks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const risk = await prisma.risk.create({
    data: {
      releaseId: body.releaseId,
      description: body.description,
      likelihood: body.likelihood,
      impact: body.impact,
      mitigation: body.mitigation || null,
    },
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
  })
  return Response.json(risk, { status: 201 })
}
