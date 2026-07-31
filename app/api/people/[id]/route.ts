import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const person = await prisma.person.findUnique({
    where: { id },
    include: { memberships: { include: { project: { include: {
      teamMembers: { include: { person: true } },
      releases: { include: { ideas: true, blockers: true, nextSteps: true, risks: true } },
    } } } } },
  })
  if (!person) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json(person)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const person = await prisma.person.update({ where: { id }, data: body })
  return Response.json(person)
}
