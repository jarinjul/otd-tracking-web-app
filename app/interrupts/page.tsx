import { prisma } from "@/lib/prisma"
import { InterruptsClient } from "./InterruptsClient"

export const metadata = { title: "Interrupts — Nexus Hub" }
export const dynamic = "force-dynamic"

export default async function InterruptsPage() {
  const [people, projects, entries] = await Promise.all([
    prisma.person.findMany({
      select: { id: true, name: true, monthlyCapacityHours: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.interruptTask.findMany({
      include: { person: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    }),
  ])

  return <InterruptsClient people={people} projects={projects} entries={entries} />
}
