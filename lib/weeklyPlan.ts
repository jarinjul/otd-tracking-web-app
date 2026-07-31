import { prisma } from "@/lib/prisma"
import { weekStart as computeWeekStart, addDays } from "@/lib/utils/date"

interface AutoItem {
  sourceRefId: string
  itemType: string
  title: string
  subtitle: string
  projectName: string
  owner: string | null
  score: number
}

async function generateAutoItems(weekStartDate: Date): Promise<AutoItem[]> {
  const weekEndDate = addDays(weekStartDate, 6)
  const today = new Date()

  const [projects, blockers, nextSteps] = await Promise.all([
    prisma.project.findMany({ include: { releases: true } }),
    prisma.blocker.findMany({ include: { release: { select: { project: { select: { name: true } } } } } }),
    prisma.nextStep.findMany({ where: { done: false }, include: { release: { select: { project: { select: { name: true } } } } } }),
  ])

  const list: AutoItem[] = []

  for (const p of projects) {
    for (const r of p.releases) {
      if (r.ragStatus === "red") {
        list.push({
          sourceRefId: `rag-${r.id}`,
          itemType: "critical",
          title: `${p.name} — ${r.version} อยู่ในสถานะ Critical`,
          subtitle: `Phase: ${r.phase} · Progress ${r.progressPercent}%`,
          projectName: p.name,
          owner: null,
          score: 100,
        })
      }
      if (r.isDelayed) {
        list.push({
          sourceRefId: `delay-${r.id}`,
          itemType: "delayed",
          title: `${p.name} — ${r.version} ล่าช้า${r.delayDays != null ? ` ${r.delayDays} วัน` : ""}`,
          subtitle: `Phase: ${r.phase}`,
          projectName: p.name,
          owner: null,
          score: 90,
        })
      }
      if (r.needsDecision) {
        list.push({
          sourceRefId: `decision-${r.id}`,
          itemType: "decision",
          title: `${p.name} — ${r.version} รอการตัดสินใจ`,
          subtitle: r.decisionNote ?? "",
          projectName: p.name,
          owner: null,
          score: 80,
        })
      }
    }
  }

  for (const b of blockers) {
    if (b.severity !== "high") continue
    list.push({
      sourceRefId: `blocker-${b.id}`,
      itemType: "blocker",
      title: b.description,
      subtitle: `Owner: ${b.owner}${b.dueDate ? ` · Due ${b.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}`,
      projectName: b.release.project.name,
      owner: b.owner,
      score: 70,
    })
  }

  for (const s of nextSteps) {
    if (s.priority !== "high" || s.dueDate > weekEndDate) continue
    const overdue = s.dueDate < today
    list.push({
      sourceRefId: `task-${s.id}`,
      itemType: "task",
      title: s.description,
      subtitle: `Owner: ${s.owner} · ${overdue ? "⚠ Overdue" : `Due ${s.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}`,
      projectName: s.release.project.name,
      owner: s.owner,
      score: overdue ? 65 : 60,
    })
  }

  return list.sort((a, b) => b.score - a.score).slice(0, 15)
}

export async function getOrCreateWeekPlan(rawWeekStart: Date) {
  const normalized = computeWeekStart(rawWeekStart)

  let plan = await prisma.weekPlan.findUnique({
    where: { weekStart: normalized },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })

  if (plan) return plan

  plan = await prisma.weekPlan.create({
    data: { weekStart: normalized },
    include: { items: true },
  })

  const autoItems = await generateAutoItems(normalized)

  const prevWeekStart = addDays(normalized, -7)
  const prevPlan = await prisma.weekPlan.findUnique({
    where: { weekStart: prevWeekStart },
    include: { items: true },
  })
  const carryItems = prevPlan ? prevPlan.items.filter((i) => i.status === "carried_over") : []

  const toCreate = [
    ...autoItems.map((a, i) => ({
      weekPlanId: plan!.id,
      source: "auto" as const,
      itemType: a.itemType,
      title: a.title,
      subtitle: a.subtitle,
      projectName: a.projectName,
      owner: a.owner,
      sourceRefId: a.sourceRefId,
      sortOrder: i,
    })),
    ...carryItems.map((c, i) => ({
      weekPlanId: plan!.id,
      source: c.source,
      itemType: c.itemType,
      title: `↻ ${c.title}`,
      subtitle: c.subtitle,
      note: c.note,
      projectName: c.projectName,
      owner: c.owner,
      sourceRefId: c.sourceRefId,
      carriedFromId: c.id,
      sortOrder: autoItems.length + i,
    })),
  ]

  if (toCreate.length > 0) {
    await prisma.weekPlanItem.createMany({ data: toCreate })
  }

  return prisma.weekPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })
}

export async function syncAutoItems(rawWeekStart: Date) {
  const normalized = computeWeekStart(rawWeekStart)
  const plan = await getOrCreateWeekPlan(normalized)
  const existingRefs = new Set(plan.items.map((i) => i.sourceRefId).filter(Boolean))

  const autoItems = await generateAutoItems(normalized)
  const missing = autoItems.filter((a) => !existingRefs.has(a.sourceRefId))

  if (missing.length === 0) return plan

  const maxOrder = plan.items.reduce((m, i) => Math.max(m, i.sortOrder), -1)
  await prisma.weekPlanItem.createMany({
    data: missing.map((a, i) => ({
      weekPlanId: plan.id,
      source: "auto" as const,
      itemType: a.itemType,
      title: a.title,
      subtitle: a.subtitle,
      projectName: a.projectName,
      owner: a.owner,
      sourceRefId: a.sourceRefId,
      sortOrder: maxOrder + 1 + i,
    })),
  })

  return prisma.weekPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })
}
