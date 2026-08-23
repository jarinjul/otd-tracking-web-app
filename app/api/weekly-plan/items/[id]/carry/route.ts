import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { addDays, toDateParam } from "@/lib/utils/date"
import { getOrCreateWeekPlan } from "@/lib/weeklyPlan"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const item = await prisma.weekPlanItem.findUnique({
    where: { id },
    include: { weekPlan: true, checklist: true },
  })
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 })

  const nextWeekStart = addDays(item.weekPlan.weekStart, 7)
  const nextWeekParam = toDateParam(nextWeekStart)
  const nextPlan = await getOrCreateWeekPlan(nextWeekParam)

  const existing = nextPlan.items.find((i) => i.carriedFromId === id)
  if (existing) {
    await prisma.weekPlanItem.update({ where: { id }, data: { status: "carried_over" } })
    return Response.json({ carriedItem: existing, nextWeekStart: nextWeekParam })
  }

  const maxOrder = nextPlan.items.reduce((m, i) => Math.max(m, i.sortOrder), -1)
  const title = item.title.startsWith("↻ ") ? item.title : `↻ ${item.title}`

  const [carriedItem] = await prisma.$transaction([
    prisma.weekPlanItem.create({
      data: {
        weekPlanId: nextPlan.id,
        source: item.source,
        itemType: item.itemType,
        title,
        subtitle: item.subtitle,
        note: item.note,
        projectName: item.projectName,
        owner: item.owner,
        sourceRefId: item.sourceRefId,
        carriedFromId: item.id,
        sortOrder: maxOrder + 1,
        checklist: {
          create: item.checklist
            .filter((c) => !c.done)
            .map((c, i) => ({ text: c.text, sortOrder: i })),
        },
      },
      include: { checklist: true },
    }),
    prisma.weekPlanItem.update({ where: { id }, data: { status: "carried_over" } }),
  ])

  return Response.json({ carriedItem, nextWeekStart: nextWeekParam })
}
