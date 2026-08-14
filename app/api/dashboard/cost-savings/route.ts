import { prisma } from "@/lib/prisma"
import { releaseInternalCost, costSavingsTotals } from "@/lib/utils/cost"

type DevEntry = { developBy: string; devLevel: string; developTimeMonths: number | null; manhours: number | null }
type AiEntry = { model: string; cost: number | null }

export async function GET() {
  const releases = await prisma.release.findMany({
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ project: { name: "asc" } }, { releaseDate: "desc" }],
  })

  const totals = costSavingsTotals(releases)

  const items = releases.map((r) => {
    const devEntries = ((r.devEntries as unknown as DevEntry[]) ?? [])
    const aiEntries = ((r.aiEntries as unknown as AiEntry[]) ?? [])
    const internal = releaseInternalCost(r)
    const hasVendor = (r.vendorCost ?? 0) > 0
    const save = hasVendor ? r.vendorCost! - internal : null
    const developTimeMonths = devEntries.length > 0
      ? Math.max(...devEntries.map((e) => e.developTimeMonths ?? 0))
      : null

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

  return Response.json({ totals, items })
}
