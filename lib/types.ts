import type {
  Project,
  Person,
  ProjectMember,
  IdeaItem,
  Blocker,
  Risk,
  NextStep,
  Release,
  ReleaseWorkload,
  RagStatus,
  Phase,
  ProjectRole,
  Severity,
  IdeaStatus,
  ReleaseStatus,
} from "@/app/generated/prisma/client"

export type {
  Project,
  Person,
  ProjectMember,
  IdeaItem,
  Blocker,
  Risk,
  NextStep,
  Release,
  ReleaseWorkload,
  RagStatus,
  Phase,
  ProjectRole,
  Severity,
  IdeaStatus,
  ReleaseStatus,
}

// ─── Hydrated types (relations included) ────────────────────────────────────

export type ReleaseWithRelations = Release & {
  ideas: IdeaItem[]
  blockers: Blocker[]
  nextSteps: NextStep[]
  risks: Risk[]
  workloadEntries?: ReleaseWorkload[]
}

export type ProjectWithRelations = Project & {
  teamMembers: (ProjectMember & { person: Person })[]
  releases: ReleaseWithRelations[]
}

export type PersonWithMemberships = Person & {
  memberships: (ProjectMember & { project: Project })[]
}

// ─── UI / Store types ────────────────────────────────────────────────────────

export type GanttViewMode = "day" | "week" | "month"

export type FilterStatus = "all" | "green" | "amber" | "red"
export type SortMode = "critical_first" | "progress_asc" | "progress_desc" | "deadline_asc"

export const BUCKET_KEYS = ["FOCUS", "NEW_PRODUCT", "REVAMP", "EXIT", "INFRA", "KTLO", "RND", "COMPLIANCE"] as const
export type BucketKey = typeof BUCKET_KEYS[number]

export const BUCKET_LABELS: Record<string, string> = {
  FOCUS:       "Focus (Customer-active)",
  NEW_PRODUCT: "New Product",
  REVAMP:      "Revamp Plan",
  EXIT:        "Exit Plan",
  INFRA:       "Infrastructure & Enabler",
  KTLO:        "Maintenance / KTLO",
  RND:         "R&D / Proof of Concept",
  COMPLIANCE:  "Compliance & Security",
}

export const BUCKET_SHORT_LABELS: Record<string, string> = {
  FOCUS:       "Focus",
  NEW_PRODUCT: "New Product",
  REVAMP:      "Revamp Plan",
  EXIT:        "Exit Plan",
  INFRA:       "Infra & Enabler",
  KTLO:        "KTLO",
  RND:         "R&D / PoC",
  COMPLIANCE:  "Compliance",
}

export const PHASE_LABELS: Record<Phase, string> = {
  ideation: "Ideation",
  alignment: "Alignment",
  prd_signoff: "PRD Sign-off",
  development: "Development",
  testing: "Testing",
  uat: "UAT",
  production: "Production",
  completed: "Completed",
}

export const PHASE_ORDER: Phase[] = [
  "ideation",
  "alignment",
  "prd_signoff",
  "development",
  "testing",
  "uat",
  "production",
  "completed",
]

export const ROLE_LABELS: Record<ProjectRole, string> = {
  ProjectManager: "Project Manager",
  TechLead: "Tech Lead",
  Developer: "Developer",
  QAEngineer: "QA Engineer",
  UIUXDesigner: "UI/UX Designer",
  BusinessAnalyst: "Business Analyst",
  Stakeholder: "Stakeholder",
  ProductOwner: "Product Owner",
  DevOps: "DevOps",
  Consultant: "Consultant",
}

export const RAG_COLORS: Record<RagStatus, string> = {
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
}
