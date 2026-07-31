import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Avatar } from "@/components/ui/Avatar"
import { WorkloadBar } from "@/components/people/WorkloadBar"
import { ProjectAssignmentCard } from "@/components/people/ProjectAssignmentCard"
import { PersonalGantt } from "@/components/people/PersonalGantt"
import { getProjectsByPerson, getTotalAllocation, getActiveProjectCount } from "@/lib/utils/people"
import { ChevronLeft } from "lucide-react"

export default async function PersonProfilePage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params

  const person = await prisma.person.findUnique({ where: { id: personId } })
  if (!person) notFound()

  const projects = await prisma.project.findMany({
    include: {
      teamMembers: { include: { person: true } },
      releases: { include: { ideas: true, blockers: true, nextSteps: true, risks: true } },
    },
  })

  const assignments = getProjectsByPerson(projects as any, personId)
  const totalAlloc = getTotalAllocation(projects as any, personId)
  const activeCount = getActiveProjectCount(projects as any, personId)
  const assignedProjects = assignments.map((a) => a.project)

  return (
    <div className="px-8 py-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link href="/people" className="flex items-center gap-1 text-text-muted hover:text-accent text-sm mb-6 transition-colors">
        <ChevronLeft size={15} />
        Back to People Directory
      </Link>

      {/* Person header */}
      <div className="flex items-start gap-5 mb-6 p-5 bg-card rounded-card border border-border">
        <Avatar name={person.name} avatarUrl={person.avatarUrl} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{person.name}</h1>
          {person.department && (
            <p className="text-text-muted">{person.department}</p>
          )}
          {person.email && (
            <a href={`mailto:${person.email}`} className="text-sm text-accent hover:underline">{person.email}</a>
          )}
        </div>
      </div>

      {/* Workload Overview */}
      <div className="mb-6 p-5 bg-card rounded-card border border-border">
        <h2 className="font-semibold text-text-primary mb-3">Workload Overview</h2>
        <WorkloadBar totalAllocation={totalAlloc} activeProjects={activeCount} />
      </div>

      {/* Project Assignments */}
      <div className="mb-6">
        <h2 className="font-semibold text-text-primary mb-3">Project Assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-text-muted italic">Not assigned to any projects.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {assignments.map(({ project, membership }) => (
              <ProjectAssignmentCard key={project.id} project={project as any} membership={membership as any} />
            ))}
          </div>
        )}
      </div>

      {/* Personal Gantt */}
      {assignedProjects.length > 0 && (
        <div>
          <h2 className="font-semibold text-text-primary mb-3">Personal Gantt View</h2>
          <PersonalGantt projects={assignedProjects as any} />
        </div>
      )}
    </div>
  )
}
