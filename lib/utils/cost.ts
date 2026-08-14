export const DEV_RATES: Record<string, number> = { M1: 3180, S4: 1590, S3: 1115, S2: 830, S1: 575 }

type DevEntry = { developBy: string; devLevel: string; developTimeMonths: number | null; manhours: number | null }
type AiEntry = { model: string; cost: number | null }
type CostRelease = {
  devEntries: unknown
  aiEntries: unknown
  vendorCost: number | null
}

export function releaseInternalCost(release: CostRelease): number {
  const devEntries = (release.devEntries as unknown as DevEntry[]) ?? []
  const aiEntries = (release.aiEntries as unknown as AiEntry[]) ?? []
  const humanCost = devEntries.reduce((s, e) => s + (e.manhours ?? 0) * (e.devLevel ? DEV_RATES[e.devLevel] ?? 0 : 0), 0)
  const aiCost = aiEntries.reduce((s, e) => s + (e.cost ?? 0), 0)
  return humanCost + aiCost
}

export function costSavingsTotals(releases: CostRelease[]): { internal: number; vendor: number; save: number; savePct: number } {
  let internalTotal = 0
  let vendorTotal = 0
  let saveTotal = 0

  for (const r of releases) {
    const internal = releaseInternalCost(r)
    internalTotal += internal
    const hasVendor = (r.vendorCost ?? 0) > 0
    if (hasVendor) {
      vendorTotal += r.vendorCost!
      saveTotal += r.vendorCost! - internal
    }
  }

  return {
    internal: internalTotal,
    vendor: vendorTotal,
    save: saveTotal,
    savePct: vendorTotal > 0 ? Math.round((saveTotal / vendorTotal) * 1000) / 10 : 0,
  }
}
