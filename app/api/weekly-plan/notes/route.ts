import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest) {
  const body = await req.json()
  if (!body.weekPlanId) {
    return Response.json({ error: "weekPlanId is required" }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.kickoffNotes !== undefined) data.kickoffNotes = body.kickoffNotes || null
  if (body.wrapupNotes !== undefined) data.wrapupNotes = body.wrapupNotes || null

  const plan = await prisma.weekPlan.update({ where: { id: body.weekPlanId }, data })
  return Response.json(plan)
}
