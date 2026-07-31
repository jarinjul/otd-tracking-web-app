import { PrismaClient } from "/Users/ghostkernel/Documents/Zenith Application/zenith/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const { Pool } = pg

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clean
  await prisma.nextStep.deleteMany()
  await prisma.risk.deleteMany()
  await prisma.blocker.deleteMany()
  await prisma.ideaItem.deleteMany()
  await prisma.release.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.person.deleteMany()

  // ─── People ───────────────────────────────────────────────────────────────────
  const alice = await prisma.person.create({ data: { name: "Alice Wonderson",  email: "alice@zenith.co",  department: "Product",     } })
  const bob   = await prisma.person.create({ data: { name: "Bob Techman",      email: "bob@zenith.co",   department: "Engineering", } })
  const carol = await prisma.person.create({ data: { name: "Carol Nguyen",     email: "carol@zenith.co", department: "Product",     } })
  const dave  = await prisma.person.create({ data: { name: "Dave Architect",   email: "dave@zenith.co",  department: "Engineering", } })
  const eve   = await prisma.person.create({ data: { name: "Eve Designstar",   email: "eve@zenith.co",   department: "Design",      } })
  const frank = await prisma.person.create({ data: { name: "Frank Devops",     email: "frank@zenith.co", department: "Engineering", } })
  const grace = await prisma.person.create({ data: { name: "Grace QA",         email: "grace@zenith.co", department: "QA",          } })

  // ─── Projects ─────────────────────────────────────────────────────────────────
  const alpha = await prisma.project.create({
    data: {
      name: "Project Alpha",
      description: "Payment gateway modernization — replacing legacy payment processor with new unified API.",
      strategicBucket: "FOCUS",
      category: "Platform",
      ragStatus: "red",
      phase: "development",
      progressPercent: 45,
      startDate: new Date("2026-06-01"),
      deadline: new Date("2026-07-31"),
      nextMilestone: "API Key from Vendor",
      nextMilestoneDate: new Date("2026-07-05"),
      isDelayed: true,
      delayDays: 5,
      budgetTotal: 1_000_000,
      budgetUsed: 650_000,
      currency: "THB",
      needsDecision: true,
      decisionNote: "ขอขยายเวลาส่งมอบออกไป 2 สัปดาห์เนื่องจาก API key ล่าช้า",
      client: "XYZ Corp",
      stakeholders: ["Mr. Johnson", "VP Engineering"],
      tags: ["payment", "backend"],
    },
  })

  const beta = await prisma.project.create({
    data: {
      name: "Project Beta",
      description: "Mobile application redesign — full UX overhaul of payment screens.",
      strategicBucket: "NEW_PRODUCT",
      category: "Mobile",
      ragStatus: "amber",
      phase: "alignment",
      progressPercent: 20,
      startDate: new Date("2026-06-15"),
      deadline: new Date("2026-08-15"),
      nextMilestone: "PRD Sign-off",
      nextMilestoneDate: new Date("2026-07-05"),
      isDelayed: false,
      budgetTotal: 500_000,
      budgetUsed: 80_000,
      currency: "THB",
      needsDecision: true,
      decisionNote: "รอหัวหน้าอนุมัติ Sign-off เอกสาร PRD",
      stakeholders: ["Mr. Boss", "Marketing Team"],
      tags: ["mobile", "ux"],
      prdContent: "## 1. Objective\nเพื่อปรับปรุงโครงสร้าง UX ของหน้าระบบจ่ายเงิน\n\n## 2. Target Scope\n- รองรับการจ่ายเงินผ่าน PromptPay\n- รองรับการจ่ายเงินผ่าน True Money Wallet",
    },
  })

  const gamma = await prisma.project.create({
    data: {
      name: "Project Gamma",
      description: "Internal dashboard for operations team — real-time inventory and order tracking.",
      strategicBucket: "FOCUS",
      category: "Internal Tool",
      ragStatus: "green",
      phase: "prd_signoff",
      progressPercent: 85,
      startDate: new Date("2026-04-01"),
      deadline: new Date("2026-07-10"),
      nextMilestone: "Delivery",
      nextMilestoneDate: new Date("2026-07-10"),
      isDelayed: false,
      budgetTotal: 300_000,
      budgetUsed: 210_000,
      currency: "THB",
      needsDecision: false,
      stakeholders: ["Ops Manager"],
      tags: ["internal", "dashboard"],
    },
  })

  const delta = await prisma.project.create({
    data: {
      name: "Project Delta",
      description: "Legacy CRM revamp — migrating from on-premise to cloud-native SaaS.",
      strategicBucket: "REVAMP",
      category: "CRM",
      ragStatus: "amber",
      phase: "ideation",
      progressPercent: 10,
      startDate: new Date("2026-07-01"),
      deadline: new Date("2026-12-31"),
      nextMilestone: "Requirements Workshop",
      nextMilestoneDate: new Date("2026-07-15"),
      isDelayed: false,
      budgetTotal: 2_000_000,
      budgetUsed: 50_000,
      currency: "THB",
      needsDecision: false,
      stakeholders: ["Sales Director"],
      tags: ["crm", "cloud"],
    },
  })

  const epsilon = await prisma.project.create({
    data: {
      name: "Project Epsilon",
      description: "Sunset legacy SMS notification service — migrate to push notifications.",
      strategicBucket: "EXIT",
      category: "Notification",
      ragStatus: "green",
      phase: "development",
      progressPercent: 60,
      startDate: new Date("2026-05-01"),
      deadline: new Date("2026-08-31"),
      nextMilestone: "Migration Complete",
      nextMilestoneDate: new Date("2026-08-01"),
      isDelayed: false,
      budgetTotal: 150_000,
      budgetUsed: 90_000,
      currency: "THB",
      needsDecision: false,
      stakeholders: ["Infra Team"],
      tags: ["notification", "migration"],
    },
  })

  // ─── ProjectMembers ───────────────────────────────────────────────────────────
  // Alpha members
  await prisma.projectMember.createMany({ data: [
    { projectId: alpha.id, personId: alice.id, role: "ProjectManager", responsibilities: ["บริหาร Scope & Timeline", "ประสานงาน Stakeholders", "จัดทำ PRD", "รายงานสถานะผู้บริหาร"], startDate: new Date("2026-06-01"), allocationPercent: 60 },
    { projectId: alpha.id, personId: bob.id,   role: "TechLead",       responsibilities: ["ออกแบบ System Architecture", "Review Code & Tech Debt", "ติดต่อ Vendor API"],               startDate: new Date("2026-06-01"), allocationPercent: 80 },
    { projectId: alpha.id, personId: grace.id, role: "QAEngineer",     responsibilities: ["เขียน Test Cases", "ทำ Regression Testing"],                                              startDate: new Date("2026-06-15"), allocationPercent: 50 },
  ]})

  // Beta members
  await prisma.projectMember.createMany({ data: [
    { projectId: beta.id, personId: carol.id, role: "ProjectManager", responsibilities: ["บริหาร Scope & Timeline", "จัดทำ PRD"], startDate: new Date("2026-06-15"), allocationPercent: 80 },
    { projectId: beta.id, personId: dave.id,  role: "TechLead",       responsibilities: ["Architecture Review", "Tech Feasibility Assessment"],      startDate: new Date("2026-06-15"), allocationPercent: 30 },
    { projectId: beta.id, personId: eve.id,   role: "UIUXDesigner",   responsibilities: ["ออกแบบ UX Flow", "สร้าง Prototype ใน Figma"],             startDate: new Date("2026-06-15"), allocationPercent: 100 },
    { projectId: beta.id, personId: bob.id,   role: "Consultant",     responsibilities: ["Technical Advisory"],                                       startDate: new Date("2026-06-20"), allocationPercent: 10 },
  ]})

  // Gamma members
  await prisma.projectMember.createMany({ data: [
    { projectId: gamma.id, personId: alice.id, role: "ProjectManager", responsibilities: ["Finalize PRD", "ติดตาม Design Asset จาก UX Team"], startDate: new Date("2026-04-01"), allocationPercent: 20 },
    { projectId: gamma.id, personId: frank.id, role: "TechLead",       responsibilities: ["Infrastructure Setup", "CI/CD Pipeline"],           startDate: new Date("2026-04-01"), allocationPercent: 80 },
    { projectId: gamma.id, personId: grace.id, role: "QAEngineer",     responsibilities: ["UAT Coordination", "Performance Testing"],          startDate: new Date("2026-05-01"), allocationPercent: 40 },
  ]})

  // Delta members
  await prisma.projectMember.createMany({ data: [
    { projectId: delta.id, personId: carol.id, role: "BusinessAnalyst", responsibilities: ["Requirements Gathering", "Stakeholder Interview"], startDate: new Date("2026-07-01"), allocationPercent: 40 },
    { projectId: delta.id, personId: dave.id,  role: "TechLead",        responsibilities: ["Cloud Architecture Design", "Migration Strategy"], startDate: new Date("2026-07-01"), allocationPercent: 60 },
  ]})

  // Epsilon members
  await prisma.projectMember.createMany({ data: [
    { projectId: epsilon.id, personId: frank.id, role: "DevOps",    responsibilities: ["Migration Script", "Infrastructure Teardown"], startDate: new Date("2026-05-01"), allocationPercent: 50 },
    { projectId: epsilon.id, personId: bob.id,   role: "Developer", responsibilities: ["API Migration", "Push Notification Integration"], startDate: new Date("2026-05-01"), allocationPercent: 30 },
  ]})

  // ─── Releases (one per project, carrying the status fields moved off Project) ──
  const alphaRelease = await prisma.release.create({ data: {
    projectId: alpha.id, version: "1.0", status: "in_progress",
    startDate: alpha.startDate, ragStatus: alpha.ragStatus, phase: alpha.phase, progressPercent: alpha.progressPercent,
    isDelayed: alpha.isDelayed, delayDays: alpha.delayDays, needsDecision: alpha.needsDecision, decisionNote: alpha.decisionNote,
  }})
  const betaRelease = await prisma.release.create({ data: {
    projectId: beta.id, version: "1.0", status: "planned",
    startDate: beta.startDate, ragStatus: beta.ragStatus, phase: beta.phase, progressPercent: beta.progressPercent,
    isDelayed: beta.isDelayed, delayDays: beta.delayDays, needsDecision: beta.needsDecision, decisionNote: beta.decisionNote,
  }})
  const gammaRelease = await prisma.release.create({ data: {
    projectId: gamma.id, version: "1.0", status: "in_progress",
    startDate: gamma.startDate, ragStatus: gamma.ragStatus, phase: gamma.phase, progressPercent: gamma.progressPercent,
    isDelayed: gamma.isDelayed, delayDays: gamma.delayDays, needsDecision: gamma.needsDecision, decisionNote: gamma.decisionNote,
  }})
  const deltaRelease = await prisma.release.create({ data: {
    projectId: delta.id, version: "1.0", status: "planned",
    startDate: delta.startDate, ragStatus: delta.ragStatus, phase: delta.phase, progressPercent: delta.progressPercent,
    isDelayed: delta.isDelayed, delayDays: delta.delayDays, needsDecision: delta.needsDecision, decisionNote: delta.decisionNote,
  }})
  const epsilonRelease = await prisma.release.create({ data: {
    projectId: epsilon.id, version: "1.0", status: "in_progress",
    startDate: epsilon.startDate, ragStatus: epsilon.ragStatus, phase: epsilon.phase, progressPercent: epsilon.progressPercent,
    isDelayed: epsilon.isDelayed, delayDays: epsilon.delayDays, needsDecision: epsilon.needsDecision, decisionNote: epsilon.decisionNote,
  }})

  // ─── Blockers ─────────────────────────────────────────────────────────────────
  await prisma.blocker.createMany({ data: [
    { releaseId: alphaRelease.id, description: "ระบบ payment ยังไม่ได้รับ API key จาก vendor", severity: "high",   owner: "Bob Techman",    dueDate: new Date("2026-07-05") },
    { releaseId: betaRelease.id,  description: "PRD รอการ sign-off จากผู้บริหาร",              severity: "medium", owner: "Carol Nguyen",   dueDate: new Date("2026-07-05") },
    { releaseId: alphaRelease.id, description: "Test environment ยังไม่พร้อม",                  severity: "medium", owner: "Grace QA",       dueDate: new Date("2026-06-30") },
  ]})

  // ─── Risks ────────────────────────────────────────────────────────────────────
  await prisma.risk.createMany({ data: [
    { releaseId: alphaRelease.id, description: "Vendor อาจไม่สามารถส่ง API key ได้ทันกำหนด", likelihood: "high",   impact: "high",   mitigation: "ประสานงานทีม procurement เพื่อเร่งรัด vendor" },
    { releaseId: alphaRelease.id, description: "Budget overrun หากต้องจ้าง consultant เพิ่ม",  likelihood: "medium", impact: "medium", mitigation: "ใช้ internal resource แทน" },
    { releaseId: betaRelease.id,  description: "Scope creep จาก stakeholder",                   likelihood: "medium", impact: "high",   mitigation: "Lock PRD หลัง sign-off ไม่รับ change request" },
    { releaseId: gammaRelease.id, description: "Performance issue ถ้า data volume เกิน threshold", likelihood: "low", impact: "medium", mitigation: "Load test ก่อน production" },
  ]})

  // ─── Next Steps ───────────────────────────────────────────────────────────────
  await prisma.nextStep.createMany({ data: [
    { releaseId: alphaRelease.id, description: "ติดต่อ vendor ขอ API key",          owner: "Alice Wonderson", dueDate: new Date("2026-06-30") },
    { releaseId: alphaRelease.id, description: "Setup test environment",             owner: "Bob Techman",    dueDate: new Date("2026-07-03") },
    { releaseId: betaRelease.id,  description: "Submit PRD for approval",            owner: "Carol Nguyen",   dueDate: new Date("2026-07-01") },
    { releaseId: betaRelease.id,  description: "Finalize Figma prototype",           owner: "Eve Designstar", dueDate: new Date("2026-07-08") },
    { releaseId: gammaRelease.id, description: "Complete UAT sign-off",              owner: "Grace QA",       dueDate: new Date("2026-07-05") },
    { releaseId: gammaRelease.id, description: "Production deployment",              owner: "Frank Devops",   dueDate: new Date("2026-07-10") },
    { releaseId: deltaRelease.id, description: "Schedule requirements workshop",     owner: "Carol Nguyen",   dueDate: new Date("2026-07-10") },
    { releaseId: epsilonRelease.id, description: "Complete push notification migration", owner: "Frank Devops", dueDate: new Date("2026-08-01") },
  ]})

  // ─── Ideas ────────────────────────────────────────────────────────────────────
  await prisma.ideaItem.createMany({ data: [
    { releaseId: betaRelease.id, title: "สแกน QR โดยตรงจากหน้าจ่ายเงิน",      description: "ผู้ใช้สามารถสแกน QR PromptPay จาก camera โดยตรง", votes: 23, status: "approved"  },
    { releaseId: betaRelease.id, title: "ผูกบัตรเดบิต/เครดิตสำหรับการชำระ",    description: "บันทึกบัตรครั้งเดียว ชำระได้ทุกครั้ง",            votes: 18, status: "reviewing" },
    { releaseId: betaRelease.id, title: "Biometric authentication สำหรับยืนยัน", description: "ใช้ Face ID / Touch ID แทนการกรอก PIN",            votes: 15, status: "draft"    },
    { releaseId: betaRelease.id, title: "Split bill feature",                    description: "แบ่งบิลกับเพื่อนได้ในแอป",                        votes: 8,  status: "rejected"  },
    { releaseId: alphaRelease.id, title: "Retry mechanism สำหรับ failed payment", description: "Auto-retry 3 ครั้งก่อนแจ้ง error",               votes: 12, status: "approved"  },
    { releaseId: alphaRelease.id, title: "Payment status webhook",               description: "Real-time notification เมื่อ payment สำเร็จ",      votes: 9,  status: "reviewing" },
  ]})

  console.log("✅ Seed complete — people:", [alice, bob, carol, dave, eve, frank, grace].length, "projects:", 5)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
