import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

// "2026-03" -> local Date at the 1st of that month (avoids UTC-shift bugs from new Date(string)).
function parseMonthParam(month: string): Date {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, 1)
}

export async function GET() {
  const entries = await prisma.releaseWorkload.findMany({
    orderBy: { updatedAt: "asc" },
  })
  return Response.json(entries)
}

// Upsert a single month cell (release x person x month). hours <= 0 deletes the entry instead.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const releaseId = String(body.releaseId)
  const personId = String(body.personId)
  const monthParam = String(body.month)
  const hours = Number(body.hours)

  if (!releaseId || !personId || !monthParam || Number.isNaN(hours)) {
    return Response.json({ error: "releaseId, personId, month, hours are required" }, { status: 400 })
  }

  const month = parseMonthParam(monthParam)

  if (hours <= 0) {
    await prisma.releaseWorkload.deleteMany({ where: { releaseId, personId, month } })
    return new Response(null, { status: 204 })
  }

  const entry = await prisma.releaseWorkload.upsert({
    where: { releaseId_personId_month: { releaseId, personId, month } },
    update: { hours },
    create: { releaseId, personId, month, hours },
  })
  return Response.json(entry, { status: 200 })
}
