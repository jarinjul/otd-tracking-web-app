import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, startDate, endDate, entries } = body as {
    projectId: string
    startDate: string
    endDate: string | null
    entries: { personId: string; role: string; allocationPercent: number | null; responsibilities: string[] }[]
  }

  if (!projectId || !startDate || !Array.isArray(entries) || entries.length === 0) {
    return Response.json({ error: "projectId, startDate, and at least one entry are required" }, { status: 400 })
  }

  const data = entries
    .filter((e) => e.personId && e.role)
    .map((e) => ({
      projectId,
      personId: e.personId,
      role: e.role as any,
      responsibilities: e.responsibilities ?? [],
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      allocationPercent: e.allocationPercent ?? null,
    }))

  if (data.length === 0) {
    return Response.json({ error: "No valid entries" }, { status: 400 })
  }

  await prisma.projectMember.createMany({ data })

  return Response.json({ created: data.length }, { status: 201 })
}
