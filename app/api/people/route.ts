import { prisma } from "@/lib/prisma"

export async function GET() {
  const people = await prisma.person.findMany({
    include: { memberships: { include: { project: true } } },
    orderBy: { name: "asc" },
  })
  return Response.json(people)
}

export async function POST(req: Request) {
  const body = await req.json()
  const person = await prisma.person.create({
    data: { name: body.name, email: body.email, department: body.department, avatarUrl: body.avatarUrl },
    include: { memberships: true },
  })
  return Response.json(person, { status: 201 })
}
