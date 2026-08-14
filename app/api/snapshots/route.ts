import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { computeSnapshot, monthStartUTC } from "@/lib/snapshot"

function parseMonthOrCurrent(param: string | null): Date {
  if (!param) return monthStartUTC(new Date())
  const [y, m] = param.split("-").map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, 1))
}

function prevMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1))
}

export async function GET(req: NextRequest) {
  const month = parseMonthOrCurrent(req.nextUrl.searchParams.get("month"))
  const [current, previous] = await Promise.all([
    prisma.monthlySnapshot.findUnique({ where: { month } }),
    prisma.monthlySnapshot.findUnique({ where: { month: prevMonth(month) } }),
  ])
  return Response.json({ current, previous })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const month = parseMonthOrCurrent(typeof body?.month === "string" ? body.month : null)
  const data = await computeSnapshot(month)

  const snapshot = await prisma.monthlySnapshot.upsert({
    where: { month },
    update: { data: data as object },
    create: { month, data: data as object },
  })
  return Response.json(snapshot)
}
