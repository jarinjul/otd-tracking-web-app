import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.planItemId || !body.text) {
    return Response.json({ error: "planItemId and text are required" }, { status: 400 })
  }

  const maxOrder = await prisma.weekPlanChecklistItem.aggregate({
    where: { planItemId: body.planItemId },
    _max: { sortOrder: true },
  })

  const item = await prisma.weekPlanChecklistItem.create({
    data: {
      planItemId: body.planItemId,
      text: body.text,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  })
  return Response.json(item, { status: 201 })
}
