import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.weekPlanId || !body.title) {
    return Response.json({ error: "weekPlanId and title are required" }, { status: 400 })
  }

  const maxOrder = await prisma.weekPlanItem.aggregate({
    where: { weekPlanId: body.weekPlanId },
    _max: { sortOrder: true },
  })

  const item = await prisma.weekPlanItem.create({
    data: {
      weekPlanId: body.weekPlanId,
      source: "manual",
      itemType: "manual",
      title: body.title,
      subtitle: body.subtitle || null,
      note: body.note || null,
      projectName: body.projectName || null,
      owner: body.owner || null,
      status: "pending",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: { checklist: true },
  })
  return Response.json(item, { status: 201 })
}
