import { prisma } from "@/lib/prisma"

export const BUCKET_META: Record<string, { label: string; color: string }> = {
  FOCUS:      { label: "Focus (Customer-active)",        color: "#2D6EE8" },
  NEW_PRODUCT:{ label: "New Product",                    color: "#10B981" },
  REVAMP:     { label: "Revamp Plan",                    color: "#F59E0B" },
  EXIT:       { label: "Exit Plan",                      color: "#EF4444" },
  INFRA:      { label: "Infrastructure & Enabler",       color: "#8B5CF6" },
  KTLO:       { label: "Maintenance / KTLO",             color: "#6B7280" },
  RND:        { label: "R&D / Proof of Concept",         color: "#06B6D4" },
  COMPLIANCE: { label: "Compliance & Security",          color: "#F97316" },
  UNASSIGNED: { label: "ยังไม่จัดกลุ่ม",                  color: "#D1D5DB" },
}

export async function GET() {
  const projects = await prisma.project.findMany({
    select: { strategicBucket: true, ragStatus: true },
  })

  const total = projects.length

  // Accumulate counts per bucket key
  const counts: Record<string, { green: number; amber: number; red: number; total: number }> = {}

  for (const p of projects) {
    const key = p.strategicBucket ?? "UNASSIGNED"
    if (!counts[key]) counts[key] = { green: 0, amber: 0, red: 0, total: 0 }
    counts[key].total++
    counts[key][p.ragStatus]++
  }

  // Build response — include all known buckets even if count is 0,
  // plus any UNASSIGNED if present
  const ALL_KEYS = ["FOCUS","NEW_PRODUCT","REVAMP","EXIT","INFRA","KTLO","RND","COMPLIANCE","UNASSIGNED"]

  const result = ALL_KEYS
    .filter((key) => key === "UNASSIGNED" ? (counts["UNASSIGNED"]?.total ?? 0) > 0 : true)
    .map((key) => {
      const meta = BUCKET_META[key]
      const c = counts[key] ?? { green: 0, amber: 0, red: 0, total: 0 }
      return {
        bucket: key,
        label: meta.label,
        color: meta.color,
        count: c.total,
        percent: total > 0 ? Math.round((c.total / total) * 1000) / 10 : 0,
        rag: { green: c.green, amber: c.amber, red: c.red },
      }
    })
    .sort((a, b) => b.count - a.count)

  return Response.json(result)
}
