"use client"

import { ExternalLink } from "lucide-react"
import { SlidePanel } from "@/components/ui/SlidePanel"
import { PortfolioBadge } from "@/components/ui/PortfolioBadge"
import { TeamSection } from "@/components/project/TeamSection"
import { ReleasesSection } from "@/components/project/ReleasesSection"
import type { ProjectWithRelations } from "@/lib/types"

interface ProjectDetailPanelProps {
  project: ProjectWithRelations | null
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 border-b border-border">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

export function ProjectDetailPanel({ project, onClose }: ProjectDetailPanelProps) {
  return (
    <SlidePanel open={!!project} onClose={onClose} width="w-[720px]">
      {project && (
        <>
          {/* Header — matches the fields editable in admin/Projects */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <PortfolioBadge bucket={(project as any).strategicBucket} />
              {project.category && (
                <span className="text-xs bg-gray-100 text-text-muted px-2 py-0.5 rounded-badge">{project.category}</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-text-primary">{project.name}</h2>
            {project.description && <p className="text-sm text-text-muted mt-1">{project.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted mt-2">
              {project.client && <span>Client: <strong className="text-text-primary">{project.client}</strong></span>}
              {project.tags.length > 0 && (
                <span className="flex gap-1">
                  {project.tags.map((t) => (
                    <span key={t} className="bg-gray-100 text-text-muted px-1.5 py-0.5 rounded text-xs">{t}</span>
                  ))}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Metadata */}
            {(project.stakeholders.length > 0 || project.prdUrl || project.designPrototypeUrl) && (
              <Section title="Metadata & Links">
                {project.stakeholders.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-text-muted mb-1.5">External Stakeholders</p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.stakeholders.map((s, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-text-muted px-2 py-1 rounded-badge">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  {project.prdUrl && (
                    <a href={project.prdUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent flex items-center gap-1 hover:underline">
                      <ExternalLink size={12} /> PRD Document
                    </a>
                  )}
                  {project.designPrototypeUrl && (
                    <a href={project.designPrototypeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent flex items-center gap-1 hover:underline">
                      <ExternalLink size={12} /> Design Prototype
                    </a>
                  )}
                </div>
              </Section>
            )}

            {/* PRD Content */}
            {project.prdContent && (
              <Section title="PRD Content">
                <p className="text-sm text-text-primary whitespace-pre-line">{project.prdContent}</p>
              </Section>
            )}

            {/* Team */}
            {project.teamMembers.length > 0 && (
              <Section title="Team & Responsibilities">
                <TeamSection project={project} />
              </Section>
            )}

            {/* All Releases — full detail per release, including that release's own Blockers & Risks / Next Steps */}
            <Section title={`Releases & Deployments (${(project.releases ?? []).length})`}>
              <ReleasesSection releases={project.releases ?? []} />
            </Section>
          </div>
        </>
      )}
    </SlidePanel>
  )
}
