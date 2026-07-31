import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const person = await prisma.person.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email || null,
      department: body.department || null,
      avatarUrl: body.avatarUrl || null,
      roles: body.roles ?? [],
    },
  })
  return Response.json(person)
}

// Partial update — only touches fields present in the body (used by the Workload page to edit capacity).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const person = await prisma.person.update({
    where: { id },
    data: {
      monthlyCapacityHours: body.monthlyCapacityHours != null ? Number(body.monthlyCapacityHours) : undefined,
    },
  })
  return Response.json(person)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.person.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
