import { prisma } from "@/lib/prisma"

// Read-only aggregate for the Admin "Cost & AI Coverage" panel: every project with
// how many of its releases carry each SAP cost-accounting code, plus its AI credit
// line items. All counting happens here so the client just renders.

type AiCredit = { modelsAi: string; costModel: number | null }

function normalizeCredits(raw: unknown): AiCredit[] {
  if (!Array.isArray(raw)) return []
  return raw.map((e) => {
    const o = (e ?? {}) as Record<string, unknown>
    const cost = o.costModel
    return {
      modelsAi: typeof o.modelsAi === "string" ? o.modelsAi : "",
      costModel: typeof cost === "number" ? cost : cost != null && !Number.isNaN(Number(cost)) ? Number(cost) : null,
    }
  })
}

const filled = (v: string | null | undefined) => (v ?? "").trim() !== ""

export async function GET() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      strategicBucket: true,
      aiCredits: true,
      releases: {
        select: {
          id: true,
          version: true,
          workforce: true,
          costCenter: true,
          costElement: true,
          ioNumber: true,
        },
        orderBy: { version: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  const rows = projects.map((p) => {
    const releases = p.releases
    const count = (key: "workforce" | "costCenter" | "costElement" | "ioNumber") =>
      releases.reduce((n, r) => n + (filled(r[key]) ? 1 : 0), 0)

    const aiCredits = normalizeCredits(p.aiCredits)
    const aiTotal = aiCredits.reduce((s, c) => s + (c.costModel ?? 0), 0)

    return {
      id: p.id,
      name: p.name,
      bucket: p.strategicBucket,
      releaseCount: releases.length,
      wf: count("workforce"),
      cc: count("costCenter"),
      ce: count("costElement"),
      io: count("ioNumber"),
      releases: releases.map((r) => ({
        id: r.id,
        version: r.version,
        workforce: r.workforce ?? "",
        costCenter: r.costCenter ?? "",
        costElement: r.costElement ?? "",
        ioNumber: r.ioNumber ?? "",
      })),
      aiCredits,
      aiCount: aiCredits.length,
      aiTotal,
    }
  })

  return Response.json(rows)
}
