import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseDateParamUTC } from "@/lib/utils/date"

// "2026-08" -> UTC range covering that whole month.
function monthRangeUTC(monthParam: string): { start: Date; end: Date } {
  const [y, m] = monthParam.split("-").map(Number)
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, 1))
  const end = new Date(Date.UTC(y, m ?? 1, 1))
  return { start, end }
}

export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get("month")
  const { start, end } = monthParam
    ? monthRangeUTC(monthParam)
    : monthRangeUTC(`${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`)

  const entries = await prisma.interruptTask.findMany({
    where: { date: { gte: start, lt: end } },
    include: { person: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  })
  return Response.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const dateParam = String(body.date ?? "")
  const personId = String(body.personId ?? "")
  const hours = Number(body.hours)
  const source = String(body.source ?? "").trim()
  const projectId = body.projectId ? String(body.projectId) : null
  const note = body.note ? String(body.note) : null

  if (!dateParam || !personId || !source || Number.isNaN(hours) || hours <= 0) {
    return Response.json({ error: "date, personId, hours (>0), source are required" }, { status: 400 })
  }

  const entry = await prisma.interruptTask.create({
    data: { date: parseDateParamUTC(dateParam), personId, hours, source, projectId, note },
    include: { person: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
  })
  return Response.json(entry, { status: 201 })
}
