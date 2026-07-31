import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const steps = await prisma.nextStep.findMany({
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
    orderBy: [{ dueDate: "asc" }],
  })
  return Response.json(steps)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const step = await prisma.nextStep.create({
    data: {
      releaseId: body.releaseId,
      description: body.description,
      owner: body.owner,
      dueDate: new Date(body.dueDate),
      done: body.done ?? false,
      priority: body.priority ?? "medium",
      effortDays: body.effortDays ?? null,
    },
    include: { release: { select: { id: true, version: true, project: { select: { id: true, name: true } } } } },
  })
  return Response.json(step, { status: 201 })
}
