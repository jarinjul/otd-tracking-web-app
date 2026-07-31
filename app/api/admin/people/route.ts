import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true } } },
  })
  return Response.json(people)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const person = await prisma.person.create({
    data: {
      name: body.name,
      email: body.email || null,
      department: body.department || null,
      avatarUrl: body.avatarUrl || null,
      roles: body.roles ?? [],
    },
  })
  return Response.json(person, { status: 201 })
}
