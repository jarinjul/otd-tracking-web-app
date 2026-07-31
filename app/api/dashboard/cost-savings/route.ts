import { prisma } from "@/lib/prisma"

const DEV_RATES: Record<string, number> = { M1: 3180, S4: 1590, S3: 1115, S2: 830, S1: 575 }

type DevEntry = { developBy: string; devLevel: string; developTimeMonths: number | null; manhours: number | null }
type AiEntry = { model: string; cost: number | null }

export async function GET() {
  const releases = await prisma.release.findMany({
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ project: { name: "asc" } }, { releaseDate: "desc" }],
  })

  let internalTotal = 0
  let vendorTotal = 0
  let saveTotal = 0

  const items = releases.map((r) => {
    const devEntries = ((r.devEntries as unknown as DevEntry[]) ?? [])
    const aiEntries = ((r.aiEntries as unknown as AiEntry[]) ?? [])

    const humanCost = devEntries.reduce((s, e) => s + (e.manhours ?? 0) * (e.devLevel ? DEV_RATES[e.devLevel] ?? 0 : 0), 0)
    const aiCost = aiEntries.reduce((s, e) => s + (e.cost ?? 0), 0)
    const internal = humanCost + aiCost
    const hasVendor = (r.vendorCost ?? 0) > 0
    const save = hasVendor ? r.vendorCost! - internal : null
    const developTimeMonths = devEntries.length > 0
      ? Math.max(...devEntries.map((e) => e.developTimeMonths ?? 0))
      : null

    internalTotal += internal
    if (hasVendor) {
      vendorTotal += r.vendorCost!
      saveTotal += save ?? 0
    }

    return {
      id: r.id,
      projectName: r.project.name,
      version: r.version,
      status: r.status,
      developBy: devEntries.map((e) => e.developBy).filter(Boolean),
      devLevels: devEntries.map((e) => e.devLevel).filter(Boolean),
      aiModels: aiEntries.map((e) => e.model).filter(Boolean),
      developTimeMonths,
      internal,
      vendorName: r.vendorName,
      vendorCost: r.vendorCost,
      vendorTimeDays: r.vendorTimeDays,
      save,
      savePct: hasVendor && r.vendorCost! > 0 ? Math.round(((save ?? 0) / r.vendorCost!) * 1000) / 10 : null,
    }
  })

  return Response.json({
    totals: {
      internal: internalTotal,
      vendor: vendorTotal,
      save: saveTotal,
      savePct: vendorTotal > 0 ? Math.round((saveTotal / vendorTotal) * 1000) / 10 : 0,
    },
    items,
  })
}
