import { prisma } from "@/lib/prisma"
import { WorkloadClient } from "./WorkloadClient"

export const metadata = { title: "Workload — Zenith Hub" }
export const dynamic = "force-dynamic"

export default async function WorkloadPage() {
  const [projects, people, entries] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        strategicBucket: true,
        releases: {
          select: { id: true, version: true, status: true, startDate: true, endDate: true },
          orderBy: { startDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.person.findMany({
      select: { id: true, name: true, avatarUrl: true, monthlyCapacityHours: true },
      orderBy: { name: "asc" },
    }),
    prisma.releaseWorkload.findMany({
      select: { releaseId: true, personId: true, month: true, hours: true },
    }),
  ])

  return <WorkloadClient projects={projects} people={people} entries={entries} />
}
