"use client"

import { Fragment, useEffect, useState, useCallback } from "react"

type DevEntry = { developBy: string; devLevel: string; developTimeMonths: string; manhours: string }
type AiEntry = { model: string; cost: string }

type DevEntryStored = { developBy: string; devLevel: string; developTimeMonths: number | null; manhours: number | null }
type AiEntryStored = { model: string; cost: number | null }

type ReleaseRow = {
  id: string; projectId: string; version: string
  startDate: string | null; endDate: string | null
  releaseDate: string | null; status: string
  features: string[]; deployNote: string | null; releaseNotes: string | null
  ragStatus: string; phase: string; progressPercent: number
  isDelayed: boolean; delayDays: number | null
  needsDecision: boolean; decisionNote: string | null
  devEntries: DevEntryStored[]
  aiEntries: AiEntryStored[]
  vendorName: string | null; vendorCost: number | null; vendorTimeDays: number | null
  workforce: string | null; costCenter: string | null; costElement: string | null; ioNumber: string | null
  createdAt: string
  project: { id: string; name: string }
}
type ProjectOption = { id: string; name: string }

const RAG_OPTIONS = [
  { value: "green", label: "🟢 Green" },
  { value: "amber", label: "🟡 Amber" },
  { value: "red",   label: "🔴 Red" },
]
const RAG_STYLE: Record<string, { bg: string; color: string }> = {
  green: { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)" },
  amber: { bg: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)" },
  red:   { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)" },
}

const PHASE_LABELS: Record<string, string> = {
  ideation: "Ideation",
  alignment: "Alignment",
  prd_signoff: "PRD Sign-off",
  development: "Development",
  testing: "Testing",
  uat: "UAT",
  production: "Production",
  completed: "Completed",
}
const PHASE_ORDER: Record<string, number> = {
  ideation: 0,
  alignment: 1,
  prd_signoff: 2,
  development: 3,
  testing: 4,
  uat: 5,
  production: 6,
  completed: 7,
}
const RAG_ORDER: Record<string, number> = { red: 0, amber: 1, green: 2 }

// Parses "YYYYR{n}.{minor}.{patch}" (e.g. 2026R1.1.0) into a comparable numeric tuple.
// Falls back to any digits found for versions that don't follow the policy format (e.g. "v1.0").
function parseVersionParts(v: string): number[] {
  const m = v.match(/^(\d{4})R(\d+)\.(\d+)\.(\d+)$/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
  const nums = (v.match(/\d+/g) ?? []).map(Number)
  while (nums.length < 4) nums.push(0)
  return nums.slice(0, 4)
}
function compareVersions(a: string, b: string): number {
  const pa = parseVersionParts(a)
  const pb = parseVersionParts(b)
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return a.localeCompare(b)
}
const PHASE_DESCRIPTIONS: Record<string, string> = {
  ideation:    "เฟสตั้งต้นไอเดีย — รวบรวมฟีเจอร์และระดมสมองบน Idea Sandbox",
  alignment:   "เฟสปรับจูนสโคป — พูดคุยความต้องการ ตรวจสอบความเป็นไปได้ และออกแบบหน้าจอร่วมกับทีม UX/UI",
  prd_signoff: "เฟสเซ็นอนุมัติสโคป — ร่างเอกสารข้อตกลงและรอหัวหน้า/ผู้บริหารอนุมัติเพื่อล็อกสโคปงาน",
  development: "เฟสกำลังพัฒนา — ทีม Developer กำลังเขียนโค้ด ซิงค์ความคืบหน้าตรงจาก Jira",
  testing:     "เฟสกำลังทดสอบ — เสร็จจากฝั่ง Dev แล้ว ทีม QA/Tester กำลังค้นหา Bug",
  uat:         "เฟสผู้ใช้ทดสอบ — เปิดระบบจำลองให้ฝั่ง Business/ลูกค้าลองใช้งานจริงเพื่อตรวจสอบความถูกต้อง",
  production:  "เฟสขึ้นระบบจริง — Go-Live ขึ้น Production ให้คนทั่วไปใช้งานได้เรียบร้อย",
  completed:   "เฟสปิดโปรเจกต์ — สิ้นสุดกระบวนการพัฒนาและส่งมอบงานทั้งหมดอย่างสมบูรณ์",
}

// ── Version format guideline (ตาม Release Cycle & Versioning Policy) ──
const VERSION_SEGMENTS = [
  { part: "2026", label: "ปี", desc: "ปีของรอบการพัฒนา", color: "var(--color-accent)" },
  { part: "R1", label: "R", desc: "Major release ลำดับที่ของปี (ปีละ 2 รอบ: R1, R2)", color: "var(--color-rag-red)" },
  { part: ".1", label: "Minor", desc: "เพิ่ม feature ย่อย/improvement โดยยัง backward compatible", color: "var(--color-rag-amber)" },
  { part: ".0", label: "Patch", desc: "แก้ bug หรือ hotfix เท่านั้น ไม่มี feature ใหม่", color: "var(--color-rag-green)" },
]
const VERSION_BUMP_RULES = [
  { from: "2026R1", to: "2026R2", when: "ออก major release รอบใหม่ → ขยับ R" },
  { from: "2026R1.0.0", to: "2026R1.1.0", when: "เพิ่ม feature ย่อย → ขยับเลขกลาง" },
  { from: "2026R1.1.0", to: "2026R1.1.1", when: "แก้ bug อย่างเดียว → ขยับเลขท้าย" },
]

// Baht/hr rate per developer level
export const DEV_RATES: Record<string, number> = {
  M1: 3180,
  S4: 1590,
  S3: 1115,
  S2: 830,
  S1: 575,
}

const fmtBaht = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_OPTIONS = [
  { value: "planned",     label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "deployed",    label: "Deployed" },
  { value: "rolled_back", label: "Rolled Back" },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  planned:     { bg: "var(--color-surface)",         color: "var(--color-text-muted)",     label: "Planned" },
  in_progress: { bg: "var(--color-accent-light)",    color: "var(--color-accent)",         label: "In Progress" },
  deployed:    { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)", label: "✓ Deployed" },
  rolled_back: { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)",   label: "↩ Rolled Back" },
}

const EMPTY_DEV_ENTRY: DevEntry = { developBy: "", devLevel: "", developTimeMonths: "", manhours: "" }
const EMPTY_AI_ENTRY: AiEntry = { model: "", cost: "" }

// ── Ideas / Blockers / Next Steps / Risks — embedded, live CRUD scoped to the release being edited ──
type IdeaRow = { id: string; title: string; description: string; votes: number; status: string }
type BlockerRow = { id: string; description: string; severity: "high" | "medium" | "low"; owner: string; dueDate: string | null }
type NextStepRow = { id: string; description: string; owner: string; dueDate: string; done: boolean; priority: "high" | "medium" | "low"; effortDays: number | null }
type RiskRow = { id: string; description: string; likelihood: "high" | "medium" | "low"; impact: "high" | "medium" | "low"; mitigation: string | null }

const IDEA_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "reviewing", label: "Reviewing" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]
const SEVERITY_OPTIONS: { value: "high" | "medium" | "low"; label: string }[] = [
  { value: "high", label: "🔴 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
]
const PRIORITY_OPTIONS: { value: "high" | "medium" | "low"; label: string }[] = [
  { value: "high", label: "🔴 P0" },
  { value: "medium", label: "🟡 P1" },
  { value: "low", label: "🟢 P2" },
]

const EMPTY_IDEA_DRAFT = { title: "", description: "" }
const EMPTY_BLOCKER_DRAFT = { description: "", severity: "medium" as "high" | "medium" | "low", owner: "", dueDate: "" }
const EMPTY_NEXTSTEP_DRAFT = { description: "", owner: "", dueDate: "", priority: "medium" as "high" | "medium" | "low", effortDays: "" }
const EMPTY_RISK_DRAFT = { description: "", likelihood: "medium" as "high" | "medium" | "low", impact: "medium" as "high" | "medium" | "low", mitigation: "" }

const miniBtnCls = "text-xs px-2.5 py-1 rounded-lg border font-medium"

const EMPTY_FORM = {
  projectId: "", version: "", startDate: "", endDate: "", releaseDate: "", status: "planned",
  features: "", deployNote: "", releaseNotes: "",
  ragStatus: "green", phase: "ideation", progressPercent: "0",
  isDelayed: false, delayDays: "",
  needsDecision: false, decisionNote: "",
  devEntries: [{ ...EMPTY_DEV_ENTRY }] as DevEntry[],
  aiEntries: [{ ...EMPTY_AI_ENTRY }] as AiEntry[],
  vendorName: "", vendorCost: "", vendorTimeDays: "",
  workforce: "", costCenter: "", costElement: "", ioNumber: "",
}
type FormState = typeof EMPTY_FORM

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{label}</label>
      {children}
      {helper && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{helper}</p>}
    </div>
  )
}
const inputCls = "w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
const inputStyle = { borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-text-primary)" }
const miniLabelCls = "text-xs font-medium mb-1 block"

function humanCostOf(e: DevEntry): number {
  const rate = e.devLevel ? DEV_RATES[e.devLevel] ?? 0 : 0
  const hrs = e.manhours !== "" ? Number(e.manhours) : 0
  return rate * hrs
}
function aiCostOf(e: AiEntry): number {
  return e.cost !== "" ? Number(e.cost) : 0
}

type MemberOption = { projectId: string; personId: string; personName: string }

export function ReleasesPanel({
  focusProjectId,
  onFocusHandled,
}: {
  focusProjectId?: string | null
  onFocusHandled?: () => void
} = {}) {
  const [releases, setReleases] = useState<ReleaseRow[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [phaseInfoOpen, setPhaseInfoOpen] = useState(false)
  const [versionInfoOpen, setVersionInfoOpen] = useState(false)
  const [filterProjectId, setFilterProjectId] = useState<string>("all")
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<"version" | "ragStatus" | "phase" | "progressPercent" | "timeline" | null>("version")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // ── Ideas / Blockers / Next Steps / Risks for the release currently open in the drawer ──
  const [releaseIdeas, setReleaseIdeas] = useState<IdeaRow[]>([])
  const [releaseBlockers, setReleaseBlockers] = useState<BlockerRow[]>([])
  const [releaseNextSteps, setReleaseNextSteps] = useState<NextStepRow[]>([])
  const [releaseRisks, setReleaseRisks] = useState<RiskRow[]>([])
  const [opsLoading, setOpsLoading] = useState(false)
  const [ideaDraft, setIdeaDraft] = useState(EMPTY_IDEA_DRAFT)
  const [blockerDraft, setBlockerDraft] = useState(EMPTY_BLOCKER_DRAFT)
  const [nextStepDraft, setNextStepDraft] = useState(EMPTY_NEXTSTEP_DRAFT)
  const [riskDraft, setRiskDraft] = useState(EMPTY_RISK_DRAFT)

  async function loadReleaseOps(releaseId: string) {
    setOpsLoading(true)
    try {
      const [iRes, bRes, nRes, rRes] = await Promise.all([
        fetch("/api/admin/ideas"),
        fetch("/api/admin/blockers"),
        fetch("/api/admin/nextsteps"),
        fetch("/api/admin/risks"),
      ])
      const [allIdeas, allBlockers, allNextSteps, allRisks] = await Promise.all([iRes.json(), bRes.json(), nRes.json(), rRes.json()])
      setReleaseIdeas(allIdeas.filter((i: any) => i.releaseId === releaseId))
      setReleaseBlockers(allBlockers.filter((b: any) => b.releaseId === releaseId))
      setReleaseNextSteps(allNextSteps.filter((n: any) => n.releaseId === releaseId))
      setReleaseRisks(allRisks.filter((r: any) => r.releaseId === releaseId))
    } catch { /* non-fatal — release form itself still works */ }
    finally { setOpsLoading(false) }
  }

  async function addIdea() {
    if (!editId || !ideaDraft.title.trim()) return
    const res = await fetch("/api/admin/ideas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: editId, title: ideaDraft.title.trim(), description: ideaDraft.description.trim() }),
    })
    if (res.ok) { const created = await res.json(); setReleaseIdeas((prev) => [...prev, created]); setIdeaDraft(EMPTY_IDEA_DRAFT) }
  }
  async function setIdeaStatus(id: string, status: string) {
    const idea = releaseIdeas.find((i) => i.id === id)
    if (!idea) return
    const res = await fetch(`/api/admin/ideas/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: editId, title: idea.title, description: idea.description, votes: idea.votes, status }),
    })
    if (res.ok) setReleaseIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))
  }
  async function deleteIdea(id: string) {
    await fetch(`/api/admin/ideas/${id}`, { method: "DELETE" })
    setReleaseIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  async function addBlocker() {
    if (!editId || !blockerDraft.description.trim() || !blockerDraft.owner.trim()) return
    const res = await fetch("/api/admin/blockers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: editId, description: blockerDraft.description.trim(), severity: blockerDraft.severity, owner: blockerDraft.owner.trim(), dueDate: blockerDraft.dueDate || null }),
    })
    if (res.ok) { const created = await res.json(); setReleaseBlockers((prev) => [...prev, created]); setBlockerDraft(EMPTY_BLOCKER_DRAFT) }
  }
  async function deleteBlocker(id: string) {
    await fetch(`/api/admin/blockers/${id}`, { method: "DELETE" })
    setReleaseBlockers((prev) => prev.filter((b) => b.id !== id))
  }

  async function addNextStep() {
    if (!editId || !nextStepDraft.description.trim() || !nextStepDraft.owner.trim() || !nextStepDraft.dueDate) return
    const res = await fetch("/api/admin/nextsteps", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        releaseId: editId, description: nextStepDraft.description.trim(), owner: nextStepDraft.owner.trim(),
        dueDate: nextStepDraft.dueDate, priority: nextStepDraft.priority,
        effortDays: nextStepDraft.effortDays !== "" ? Number(nextStepDraft.effortDays) : null,
      }),
    })
    if (res.ok) { const created = await res.json(); setReleaseNextSteps((prev) => [...prev, created]); setNextStepDraft(EMPTY_NEXTSTEP_DRAFT) }
  }
  async function toggleNextStepDone(step: NextStepRow) {
    const res = await fetch(`/api/admin/nextsteps/${step.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: editId, description: step.description, owner: step.owner, dueDate: step.dueDate, priority: step.priority, effortDays: step.effortDays, done: !step.done }),
    })
    if (res.ok) setReleaseNextSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)))
  }
  async function deleteNextStep(id: string) {
    await fetch(`/api/admin/nextsteps/${id}`, { method: "DELETE" })
    setReleaseNextSteps((prev) => prev.filter((s) => s.id !== id))
  }

  async function addRisk() {
    if (!editId || !riskDraft.description.trim()) return
    const res = await fetch("/api/admin/risks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: editId, description: riskDraft.description.trim(), likelihood: riskDraft.likelihood, impact: riskDraft.impact, mitigation: riskDraft.mitigation.trim() || null }),
    })
    if (res.ok) { const created = await res.json(); setReleaseRisks((prev) => [...prev, created]); setRiskDraft(EMPTY_RISK_DRAFT) }
  }
  async function deleteRisk(id: string) {
    await fetch(`/api/admin/risks/${id}`, { method: "DELETE" })
    setReleaseRisks((prev) => prev.filter((r) => r.id !== id))
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, prRes, mRes] = await Promise.all([fetch("/api/admin/releases"), fetch("/api/projects"), fetch("/api/admin/members")])
      setReleases(await rRes.json())
      const ps = await prRes.json()
      setProjects(ps.map((p: any) => ({ id: p.id, name: p.name })))
      const ms = await mRes.json()
      setMembers(ms.map((m: any) => ({ projectId: m.project.id, personId: m.person.id, personName: m.person.name })))
    } catch { showFeedback("error", "Failed to load data") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Deep-link from the Cost & AI Coverage panel: filter to the project and open its group.
  useEffect(() => {
    if (!focusProjectId || loading) return
    setFilterProjectId(focusProjectId)
    setExpandedProjects(new Set([focusProjectId]))
    onFocusHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusProjectId, loading])

  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg }); setTimeout(() => setFeedback(null), 4000)
  }

  function openCreate() {
    setEditId(null); setForm({ ...EMPTY_FORM, projectId: projects[0]?.id ?? "" }); setDrawerOpen(true)
    setReleaseIdeas([]); setReleaseBlockers([]); setReleaseNextSteps([]); setReleaseRisks([])
    setIdeaDraft(EMPTY_IDEA_DRAFT); setBlockerDraft(EMPTY_BLOCKER_DRAFT); setNextStepDraft(EMPTY_NEXTSTEP_DRAFT); setRiskDraft(EMPTY_RISK_DRAFT)
  }

  function openEdit(r: ReleaseRow) {
    setEditId(r.id)
    setForm({
      projectId: r.projectId,
      version: r.version,
      startDate: r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : "",
      endDate: r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : "",
      releaseDate: r.releaseDate ? new Date(r.releaseDate).toISOString().slice(0, 10) : "",
      status: r.status,
      features: (r.features ?? []).join(", "),
      deployNote: r.deployNote ?? "",
      releaseNotes: r.releaseNotes ?? "",
      ragStatus: r.ragStatus ?? "green",
      phase: r.phase ?? "ideation",
      progressPercent: r.progressPercent != null ? String(r.progressPercent) : "0",
      isDelayed: r.isDelayed ?? false,
      delayDays: r.delayDays != null ? String(r.delayDays) : "",
      needsDecision: r.needsDecision ?? false,
      decisionNote: r.decisionNote ?? "",
      devEntries: (r.devEntries ?? []).length > 0
        ? r.devEntries.map((e) => ({
            developBy: e.developBy ?? "",
            devLevel: e.devLevel ?? "",
            developTimeMonths: e.developTimeMonths != null ? String(e.developTimeMonths) : "",
            manhours: e.manhours != null ? String(e.manhours) : "",
          }))
        : [{ ...EMPTY_DEV_ENTRY }],
      aiEntries: (r.aiEntries ?? []).length > 0
        ? r.aiEntries.map((e) => ({ model: e.model ?? "", cost: e.cost != null ? String(e.cost) : "" }))
        : [{ ...EMPTY_AI_ENTRY }],
      vendorName: r.vendorName ?? "",
      vendorCost: r.vendorCost != null ? String(r.vendorCost) : "",
      vendorTimeDays: r.vendorTimeDays != null ? String(r.vendorTimeDays) : "",
      workforce: r.workforce ?? "",
      costCenter: r.costCenter ?? "",
      costElement: r.costElement ?? "",
      ioNumber: r.ioNumber ?? "",
    })
    setDrawerOpen(true)
    setIdeaDraft(EMPTY_IDEA_DRAFT); setBlockerDraft(EMPTY_BLOCKER_DRAFT); setNextStepDraft(EMPTY_NEXTSTEP_DRAFT); setRiskDraft(EMPTY_RISK_DRAFT)
    loadReleaseOps(r.id)
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) { setForm((f) => ({ ...f, [key]: val })) }

  function updateDevEntry(i: number, patch: Partial<DevEntry>) {
    setForm((f) => ({ ...f, devEntries: f.devEntries.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))
  }
  function addDevEntry() {
    setForm((f) => ({ ...f, devEntries: [...f.devEntries, { ...EMPTY_DEV_ENTRY }] }))
  }
  function removeDevEntry(i: number) {
    setForm((f) => ({ ...f, devEntries: f.devEntries.filter((_, j) => j !== i) }))
  }

  function updateAiEntry(i: number, patch: Partial<AiEntry>) {
    setForm((f) => ({ ...f, aiEntries: f.aiEntries.map((e, j) => (j === i ? { ...e, ...patch } : e)) }))
  }
  function addAiEntry() {
    setForm((f) => ({ ...f, aiEntries: [...f.aiEntries, { ...EMPTY_AI_ENTRY }] }))
  }
  function removeAiEntry(i: number) {
    setForm((f) => ({ ...f, aiEntries: f.aiEntries.filter((_, j) => j !== i) }))
  }

  function buildPayload() {
    const devEntries = form.devEntries
      .filter((e) => e.developBy.trim() || e.devLevel || e.manhours !== "")
      .map((e) => ({
        developBy: e.developBy.trim(),
        devLevel: e.devLevel,
        developTimeMonths: e.developTimeMonths !== "" ? Number(e.developTimeMonths) : null,
        manhours: e.manhours !== "" ? Number(e.manhours) : null,
      }))
    const aiEntries = form.aiEntries
      .filter((e) => e.model.trim() || e.cost !== "")
      .map((e) => ({ model: e.model.trim(), cost: e.cost !== "" ? Number(e.cost) : null }))

    return {
      projectId: form.projectId,
      version: form.version,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      releaseDate: form.releaseDate || null,
      status: form.status,
      features: form.features.split(",").map((s) => s.trim()).filter(Boolean),
      deployNote: form.deployNote || null,
      releaseNotes: form.releaseNotes || null,
      ragStatus: form.ragStatus,
      phase: form.phase,
      progressPercent: form.progressPercent !== "" ? Number(form.progressPercent) : 0,
      isDelayed: form.isDelayed,
      delayDays: form.delayDays !== "" ? Number(form.delayDays) : null,
      needsDecision: form.needsDecision,
      decisionNote: form.decisionNote || null,
      devEntries,
      aiEntries,
      vendorName: form.vendorName || null,
      vendorCost: form.vendorCost !== "" ? Number(form.vendorCost) : null,
      vendorTimeDays: form.vendorTimeDays !== "" ? Number(form.vendorTimeDays) : null,
      workforce: form.workforce.trim() || null,
      costCenter: form.costCenter.trim() || null,
      costElement: form.costElement.trim() || null,
      ioNumber: form.ioNumber.trim() || null,
    }
  }

  // People assigned to the release's project (admin/Project Members) — populates the Develop By dropdown
  const projectMembers = members.filter((m) => m.projectId === form.projectId)

  // ── Live cost computation for the form summary box ──
  const liveHumanCost = form.devEntries.reduce((s, e) => s + humanCostOf(e), 0)
  const liveAiCost = form.aiEntries.reduce((s, e) => s + aiCostOf(e), 0)
  const liveInternalTotal = liveHumanCost + liveAiCost
  const liveVendorCost = form.vendorCost !== "" ? Number(form.vendorCost) : 0
  const liveSave = liveVendorCost > 0 ? liveVendorCost - liveInternalTotal : 0
  const liveSavePct = liveVendorCost > 0 ? Math.round((liveSave / liveVendorCost) * 1000) / 10 : 0

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const url = editId ? `/api/admin/releases/${editId}` : "/api/admin/releases"
      const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) })
      if (!res.ok) throw new Error()
      showFeedback("success", editId ? "Release updated" : "Release created")
      setDrawerOpen(false); await load()
    } catch { showFeedback("error", "Save failed — check required fields") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/admin/releases/${id}`, { method: "DELETE" })
      showFeedback("success", "Release deleted"); setConfirmDelete(null); await load()
    } catch { showFeedback("error", "Delete failed") }
  }

  function releaseCosts(r: ReleaseRow) {
    const humanCost = (r.devEntries ?? []).reduce((s, e) => s + (e.manhours ?? 0) * (e.devLevel ? DEV_RATES[e.devLevel] ?? 0 : 0), 0)
    const aiCost = (r.aiEntries ?? []).reduce((s, e) => s + (e.cost ?? 0), 0)
    const internal = humanCost + aiCost
    const save = (r.vendorCost ?? 0) > 0 ? (r.vendorCost ?? 0) - internal : null
    return { internal, save }
  }

  function toggleSort(key: "version" | "ragStatus" | "phase" | "progressPercent" | "timeline") {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function toggleProjectExpand(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  // Filter by selected project
  const filteredReleases = filterProjectId === "all"
    ? releases
    : releases.filter((r) => r.projectId === filterProjectId)

  // Sort a set of releases by the active sort key (used within each project group)
  function applySortKey(list: ReleaseRow[]) {
    if (!sortKey) return list
    const dir = sortDir === "asc" ? 1 : -1
    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === "version") cmp = compareVersions(a.version, b.version)
      else if (sortKey === "ragStatus") cmp = RAG_ORDER[a.ragStatus] - RAG_ORDER[b.ragStatus]
      else if (sortKey === "phase") cmp = PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]
      else if (sortKey === "progressPercent") cmp = a.progressPercent - b.progressPercent
      else if (sortKey === "timeline") {
        const aTime = a.startDate ? new Date(a.startDate).getTime() : 0
        const bTime = b.startDate ? new Date(b.startDate).getTime() : 0
        cmp = aTime - bTime
      }
      return cmp * dir
    })
  }

  // Group releases by project (projects already come alphabetically from the API,
  // release order within a project preserved / re-sorted by the active sort key).
  const groupedProjects = (() => {
    const order: string[] = []
    const byProject = new Map<string, { projectId: string; projectName: string; releases: ReleaseRow[] }>()
    for (const r of filteredReleases) {
      if (!byProject.has(r.projectId)) {
        byProject.set(r.projectId, { projectId: r.projectId, projectName: r.project.name, releases: [] })
        order.push(r.projectId)
      }
      byProject.get(r.projectId)!.releases.push(r)
    }
    return order.map((id) => {
      const g = byProject.get(id)!
      return { ...g, releases: applySortKey(g.releases) }
    })
  })()

  const deployed = filteredReleases.filter((r) => r.status === "deployed").length

  // Totals recalculate to match the selected project filter
  const totals = filteredReleases.reduce(
    (acc, r) => {
      const { internal, save } = releaseCosts(r)
      acc.internal += internal
      if ((r.vendorCost ?? 0) > 0) {
        acc.vendor += r.vendorCost!
        acc.save += save ?? 0
      }
      return acc
    },
    { internal: 0, vendor: 0, save: 0 }
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Releases</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {filteredReleases.length} total — {deployed} deployed
            {filterProjectId !== "all" && (
              <span> · filtered by <strong style={{ color: "var(--color-text-primary)" }}>{projects.find((p) => p.id === filterProjectId)?.name}</strong></span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 text-sm rounded-lg border"
            style={inputStyle}
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: "var(--color-accent)" }}>+ New Release</button>
        </div>
      </div>

      {/* Cost summary cards */}
      {totals.internal > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>Internal Dev + AI Total</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>{fmtBaht(totals.internal)} ฿</p>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>Vendor Quotes Total</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{fmtBaht(totals.vendor)} ฿</p>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-rag-green)", background: "var(--color-rag-green-light)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-rag-green-text)" }}>Total Estimate Save</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--color-rag-green-text)" }}>
              {fmtBaht(totals.save)} ฿
              {totals.vendor > 0 && <span className="text-sm font-semibold ml-2">({Math.round((totals.save / totals.vendor) * 100)}%)</span>}
            </p>
          </div>
        </div>
      )}

      {feedback && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: feedback.type === "success" ? "var(--color-rag-green-light)" : "var(--color-rag-red-light)", color: feedback.type === "success" ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}>
          {feedback.type === "success" ? "✓ " : "✗ "}{feedback.msg}
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
        {loading ? <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Loading…</div>
          : filteredReleases.length === 0 ? <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>{releases.length === 0 ? "No releases yet. Create one above." : "No releases match this filter."}</div>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>Project</th>
                  {([
                    { key: "version", label: "Version" },
                    { key: "ragStatus", label: "RAG" },
                    { key: "phase", label: "Phase" },
                    { key: "progressPercent", label: "Progress" },
                    { key: "timeline", label: "Timeline" },
                  ] as const).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap cursor-pointer select-none transition-colors hover:bg-gray-100"
                      style={{ color: sortKey === col.key ? "var(--color-accent)" : "var(--color-text-muted)" }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <span style={{ opacity: sortKey === col.key ? 1 : 0.3 }}>
                          {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "▲"}
                        </span>
                      </span>
                    </th>
                  ))}
                  {["Status", "Develop By", "Internal + AI (฿)", "Vendor (฿)", "Save (฿)", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedProjects.map((g, gi) => {
                  const expanded = expandedProjects.has(g.projectId)
                  const worstRag = g.releases.reduce((worst, r) => (RAG_ORDER[r.ragStatus] < RAG_ORDER[worst] ? r.ragStatus : worst), "green")
                  const groupTotals = g.releases.reduce(
                    (acc, r) => {
                      const { internal, save } = releaseCosts(r)
                      acc.internal += internal
                      if ((r.vendorCost ?? 0) > 0) { acc.vendor += r.vendorCost!; acc.save += save ?? 0 }
                      return acc
                    },
                    { internal: 0, vendor: 0, save: 0 }
                  )
                  const ragStyle = RAG_STYLE[worstRag] ?? RAG_STYLE.green

                  return (
                    <Fragment key={g.projectId}>
                      {/* Project group header row — click to expand/collapse its releases */}
                      <tr
                        onClick={() => toggleProjectExpand(g.projectId)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                        style={{ borderTop: gi > 0 ? "1px solid var(--color-border)" : undefined, background: "var(--color-surface)" }}
                      >
                        <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }} colSpan={2}>
                          <span className="inline-flex items-center gap-2">
                            <span style={{ display: "inline-block", transition: "transform 0.15s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                            {g.projectName}
                            <span className="px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>
                              {g.releases.length} release{g.releases.length > 1 ? "s" : ""}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: ragStyle.bg, color: ragStyle.color }}>
                            {RAG_OPTIONS.find((o) => o.value === worstRag)?.label ?? worstRag}
                          </span>
                        </td>
                        <td colSpan={5}></td>
                        <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                          {groupTotals.internal > 0 ? fmtBaht(groupTotals.internal) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                          {groupTotals.vendor > 0 ? fmtBaht(groupTotals.vendor) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums font-semibold" style={{ color: groupTotals.save >= 0 ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}>
                          {groupTotals.vendor > 0 ? fmtBaht(groupTotals.save) : "—"}
                        </td>
                        <td></td>
                      </tr>

                      {/* Sub-rows — this project's individual releases, shown when expanded */}
                      {expanded && g.releases.map((r) => {
                        const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.planned
                        const rag = RAG_STYLE[r.ragStatus] ?? RAG_STYLE.green
                        const { internal, save } = releaseCosts(r)
                        return (
                          <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                            <td className="pl-9 pr-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>↳</td>
                            <td className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--color-accent)" }}>{r.version}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: rag.bg, color: rag.color }}>
                                {RAG_OPTIONS.find((o) => o.value === r.ragStatus)?.label ?? r.ragStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{PHASE_LABELS[r.phase] ?? r.phase}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>{r.progressPercent}%</td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                              {r.startDate || r.endDate
                                ? `${r.startDate ? new Date(r.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"} → ${r.endDate ? new Date(r.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}`
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                              {(r.devEntries ?? []).length > 0 ? r.devEntries.map((e) => e.developBy).filter(Boolean).join(", ") : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                              {internal > 0 ? fmtBaht(internal) : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                              {(r.vendorCost ?? 0) > 0 ? fmtBaht(r.vendorCost!) : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs tabular-nums font-semibold" style={{ color: save != null && save >= 0 ? "var(--color-rag-green-text)" : save != null ? "var(--color-rag-red-text)" : "var(--color-text-muted)" }}>
                              {save != null ? fmtBaht(save) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="text-xs px-3 py-1.5 rounded-lg border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(r.id) }} className="text-xs px-3 py-1.5 rounded-lg border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-rag-red)" }}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {/* Group total — sum of this project's releases, shown after the last release row */}
                      {expanded && g.releases.length > 1 && (
                        <tr style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                          <td className="pl-9 pr-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-primary)" }} colSpan={8}>
                            Total ({g.releases.length} releases)
                          </td>
                          <td className="px-4 py-2.5 text-xs font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                            {groupTotals.internal > 0 ? fmtBaht(groupTotals.internal) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                            {groupTotals.vendor > 0 ? fmtBaht(groupTotals.vendor) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-semibold tabular-nums" style={{ color: groupTotals.save >= 0 ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}>
                            {groupTotals.vendor > 0 ? fmtBaht(groupTotals.save) : "—"}
                          </td>
                          <td></td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden" style={{ width: 560, background: "var(--color-card)", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>{editId ? "Edit Release" : "New Release"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-lg leading-none" style={{ color: "var(--color-text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              <Field label="Project *">
                <select className={inputCls} style={inputStyle} value={form.projectId} onChange={(e) => setField("projectId", e.target.value)} required>
                  <option value="">— Select project —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>

              <div className="flex flex-col gap-1 relative">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Version *</label>
                  <button
                    type="button"
                    onClick={() => setVersionInfoOpen((o) => !o)}
                    className="w-4 h-4 rounded-full text-xs leading-none flex items-center justify-center border"
                    style={{
                      borderColor: versionInfoOpen ? "var(--color-accent)" : "var(--color-border)",
                      color: versionInfoOpen ? "white" : "var(--color-accent)",
                      background: versionInfoOpen ? "var(--color-accent)" : "transparent",
                    }}
                    title="ดูรูปแบบเลขเวอร์ชันตาม Release Policy"
                  >
                    i
                  </button>
                </div>
                <input className={inputCls} style={inputStyle} value={form.version} onChange={(e) => setField("version", e.target.value)} required placeholder="e.g. 2026R1.1.0" />
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  รูปแบบ: <code className="font-mono">YYYY R{"{n}"}.{"{minor}"}.{"{patch}"}</code> — ปี + Major (R1/R2) + Minor (feature) + Patch (bug fix)
                </p>

                {versionInfoOpen && (
                  <div className="absolute z-10 top-full left-0 mt-1 rounded-xl border shadow-lg p-4 flex flex-col gap-3" style={{ width: 420, background: "var(--color-card)", borderColor: "var(--color-border)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>รูปแบบเลขเวอร์ชัน — เช่น 2026R1.1.0</p>
                      <button type="button" onClick={() => setVersionInfoOpen(false)} className="text-sm leading-none" style={{ color: "var(--color-text-muted)" }}>✕</button>
                    </div>

                    <div className="flex items-stretch gap-1.5 flex-wrap">
                      {VERSION_SEGMENTS.map((seg) => (
                        <div key={seg.label} className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--color-border)", minWidth: 92 }}>
                          <div className="px-2 py-1.5 text-center font-mono font-bold text-xs text-white" style={{ background: seg.color }}>
                            {seg.part}
                          </div>
                          <div className="px-2 py-1.5" style={{ background: "var(--color-surface)" }}>
                            <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{seg.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{seg.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>กติกาการขยับเลข</p>
                      {VERSION_BUMP_RULES.map((rule) => (
                        <div key={rule.from} className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5" style={{ background: "var(--color-surface)" }}>
                          <span className="font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>{rule.from}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>→</span>
                          <span className="font-mono font-semibold" style={{ color: "var(--color-accent)" }}>{rule.to}</span>
                          <span className="ml-auto text-right" style={{ color: "var(--color-text-muted)" }}>{rule.when}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date" helper="ใช้แสดงเป็นแถบใน Gantt">
                  <input type="date" className={inputCls} style={inputStyle} value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
                </Field>
                <Field label="End Date" helper="ใช้แสดงเป็นแถบใน Gantt">
                  <input type="date" className={inputCls} style={inputStyle} value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} />
                </Field>
              </div>

              <Field label="Release Date" helper="วันที่ deploy / go-live">
                <input type="date" className={inputCls} style={inputStyle} value={form.releaseDate} onChange={(e) => setField("releaseDate", e.target.value)} />
              </Field>

              <Field label="Status *">
                <select className={inputCls} style={inputStyle} value={form.status} onChange={(e) => setField("status", e.target.value)} required>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              {/* ── Section: Status & Progress (moved from Project) ── */}
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                Status & Progress
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Field label="RAG Status *">
                  <select className={inputCls} style={inputStyle} value={form.ragStatus} onChange={(e) => setField("ragStatus", e.target.value)} required>
                    {RAG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>

                <div className="flex flex-col gap-1 relative">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Phase *</label>
                    <button
                      type="button"
                      onClick={() => setPhaseInfoOpen((o) => !o)}
                      className="w-4 h-4 rounded-full text-xs leading-none flex items-center justify-center border"
                      style={{
                        borderColor: phaseInfoOpen ? "var(--color-accent)" : "var(--color-border)",
                        color: phaseInfoOpen ? "white" : "var(--color-accent)",
                        background: phaseInfoOpen ? "var(--color-accent)" : "transparent",
                      }}
                      title="ดูคำอธิบายทุก Phase"
                    >
                      i
                    </button>
                  </div>
                  <select className={inputCls} style={inputStyle} value={form.phase} onChange={(e) => setField("phase", e.target.value)} required>
                    {Object.entries(PHASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{PHASE_DESCRIPTIONS[form.phase] ?? ""}</p>

                  {phaseInfoOpen && (
                    <div className="absolute z-10 top-full right-0 mt-1 rounded-xl border shadow-lg p-4 flex flex-col gap-2.5" style={{ width: 440, background: "var(--color-card)", borderColor: "var(--color-border)" }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>Phase Definitions</p>
                        <button type="button" onClick={() => setPhaseInfoOpen(false)} className="text-sm leading-none" style={{ color: "var(--color-text-muted)" }}>✕</button>
                      </div>
                      {Object.entries(PHASE_LABELS).map(([v, l], i) => (
                        <div key={v} className="flex gap-2 text-xs">
                          <span className="font-semibold shrink-0" style={{ color: "var(--color-accent)" }}>{i + 1}.</span>
                          <div>
                            <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{l}:</span>{" "}
                            <span style={{ color: "var(--color-text-muted)" }}>{PHASE_DESCRIPTIONS[v]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Field label="Progress (%) *">
                <input type="number" min={0} max={100} className={inputCls} style={inputStyle} value={form.progressPercent} onChange={(e) => setField("progressPercent", e.target.value)} required />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Is Delayed">
                  <div className="flex items-center gap-2 py-2">
                    <input type="checkbox" id="isDelayed" checked={form.isDelayed} onChange={(e) => setField("isDelayed", e.target.checked)} className="w-4 h-4 accent-accent" />
                    <label htmlFor="isDelayed" className="text-sm" style={{ color: "var(--color-text-primary)" }}>Mark as delayed</label>
                  </div>
                </Field>
                <Field label="Delay Days">
                  <input type="number" min={0} className={inputCls} style={inputStyle} value={form.delayDays} onChange={(e) => setField("delayDays", e.target.value)} placeholder="0" />
                </Field>
              </div>

              <Field label="Needs Decision">
                <div className="flex items-center gap-2 py-2">
                  <input type="checkbox" id="needsDecision" checked={form.needsDecision} onChange={(e) => setField("needsDecision", e.target.checked)} className="w-4 h-4 accent-accent" />
                  <label htmlFor="needsDecision" className="text-sm" style={{ color: "var(--color-text-primary)" }}>Flag as needing executive decision (รอตัดสินใจ)</label>
                </div>
              </Field>

              {form.needsDecision && (
                <Field label="Decision Note">
                  <input className={inputCls} style={inputStyle} value={form.decisionNote} onChange={(e) => setField("decisionNote", e.target.value)} placeholder="Describe what decision is needed" />
                </Field>
              )}

              <Field label="Features" helper="Separate multiple values with commas">
                <textarea className={inputCls} style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} value={form.features} onChange={(e) => setField("features", e.target.value)} placeholder="e.g. Login SSO, Export PDF, Dashboard v2" />
              </Field>

              <Field label="Deploy Note" helper="รายละเอียดการ deploy เช่น environment, ขั้นตอน">
                <textarea className={inputCls} style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} value={form.deployNote} onChange={(e) => setField("deployNote", e.target.value)} placeholder="e.g. Deploy to production via CI/CD pipeline, blue-green" />
              </Field>

              <Field label="Release Notes">
                <textarea className={inputCls} style={{ ...inputStyle, resize: "vertical", minHeight: 120 }} value={form.releaseNotes} onChange={(e) => setField("releaseNotes", e.target.value)} placeholder="Full release notes…" />
              </Field>

              {/* ── Section: Internal Dev ── */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  Internal Dev
                </p>
                <button type="button" onClick={addDevEntry} className="text-xs px-3 py-1.5 rounded-lg border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>
                  + เพิ่มชุดข้อมูล
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {form.devEntries.map((entry, i) => (
                  <div key={i} className="rounded-xl border p-3 relative" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    {form.devEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDevEntry(i)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center border"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-rag-red)", background: "var(--color-card)" }}
                        title="ลบชุดนี้"
                      >
                        ✕
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Develop By</label>
                        <select className={inputCls} style={inputStyle} value={entry.developBy} onChange={(e) => updateDevEntry(i, { developBy: e.target.value })}>
                          <option value="">— Select person —</option>
                          {Array.from(new Set([...projectMembers.map((m) => m.personName), ...(entry.developBy ? [entry.developBy] : [])])).map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        {projectMembers.length === 0 && (
                          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                            ยังไม่มีคนถูก assign ใน Project นี้ — ไปเพิ่มที่ Project Members ก่อน
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Dev Level</label>
                        <select className={inputCls} style={inputStyle} value={entry.devLevel} onChange={(e) => updateDevEntry(i, { devLevel: e.target.value })}>
                          <option value="">— None —</option>
                          {Object.entries(DEV_RATES).map(([lv, rate]) => (
                            <option key={lv} value={lv}>{lv} ({rate.toLocaleString()} ฿/hr)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Develop Time (Months)</label>
                        <input type="number" step="0.5" min="0" className={inputCls} style={inputStyle} value={entry.developTimeMonths} onChange={(e) => updateDevEntry(i, { developTimeMonths: e.target.value })} placeholder="e.g. 6" />
                      </div>
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Manhours</label>
                        <input type="number" min="0" className={inputCls} style={inputStyle} value={entry.manhours} onChange={(e) => updateDevEntry(i, { manhours: e.target.value })} placeholder="e.g. 960" />
                      </div>
                    </div>
                    {humanCostOf(entry) > 0 && (
                      <p className="text-xs mt-2 pt-2 border-t" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                        Cost: <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{fmtBaht(humanCostOf(entry))} ฿</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Section: AI Model ── */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  AI Model
                </p>
                <button type="button" onClick={addAiEntry} className="text-xs px-3 py-1.5 rounded-lg border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>
                  + เพิ่มชุดข้อมูล
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {form.aiEntries.map((entry, i) => (
                  <div key={i} className="rounded-xl border p-3 relative" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    {form.aiEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAiEntry(i)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center border"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-rag-red)", background: "var(--color-card)" }}
                        title="ลบชุดนี้"
                      >
                        ✕
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>AI Model</label>
                        <input className={inputCls} style={inputStyle} value={entry.model} onChange={(e) => updateAiEntry(i, { model: e.target.value })} placeholder="e.g. Claude" />
                      </div>
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>AI Total Cost (Baht)</label>
                        <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={entry.cost} onChange={(e) => updateAiEntry(i, { cost: e.target.value })} placeholder="e.g. 8400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Section: Vendor ── */}
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                Vendor (Outsource Comparison)
              </p>

              <Field label="Vendor Name">
                <input className={inputCls} style={inputStyle} value={form.vendorName} onChange={(e) => setField("vendorName", e.target.value)} placeholder="e.g. ABC Software House" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Vendor Quote (Baht)" helper="ราคาถ้าจ้าง Vendor ทำ">
                  <input type="number" min="0" className={inputCls} style={inputStyle} value={form.vendorCost} onChange={(e) => setField("vendorCost", e.target.value)} placeholder="e.g. 3000000" />
                </Field>
                <Field label="Vendor Time (Days)" helper="เวลาถ้าจ้าง Vendor ทำ">
                  <input type="number" step="1" min="0" className={inputCls} style={inputStyle} value={form.vendorTimeDays} onChange={(e) => setField("vendorTimeDays", e.target.value)} placeholder="e.g. 90" />
                </Field>
              </div>

              {/* Live cost summary */}
              {(liveHumanCost > 0 || liveAiCost > 0 || liveVendorCost > 0) && (
                <div className="rounded-xl border p-4 flex flex-col gap-1.5 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--color-text-muted)" }}>คน Total Cost</span>
                    <span className="font-medium tabular-nums" style={{ color: "var(--color-text-primary)" }}>{fmtBaht(liveHumanCost)} ฿</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--color-text-muted)" }}>AI Total Cost</span>
                    <span className="font-medium tabular-nums" style={{ color: "var(--color-text-primary)" }}>{fmtBaht(liveAiCost)} ฿</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5" style={{ borderColor: "var(--color-border)" }}>
                    <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>Internal Dev + AI Total</span>
                    <span className="font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>{fmtBaht(liveInternalTotal)} ฿</span>
                  </div>
                  {liveVendorCost > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span style={{ color: "var(--color-text-muted)" }}>จ้าง Vendor Develop</span>
                        <span className="font-medium tabular-nums" style={{ color: "var(--color-text-primary)" }}>{fmtBaht(liveVendorCost)} ฿</span>
                      </div>
                      <div className="flex justify-between border-t pt-1.5" style={{ borderColor: "var(--color-border)" }}>
                        <span className="font-semibold" style={{ color: liveSave >= 0 ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}>
                          Estimate Save Cost ({liveSavePct}%)
                        </span>
                        <span className="font-bold tabular-nums" style={{ color: liveSave >= 0 ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)" }}>
                          {fmtBaht(liveSave)} ฿
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Section: Cost Accounting (SAP) ── */}
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                Cost Accounting (SAP)
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Workforce (WF)">
                  <input className={inputCls} style={inputStyle} value={form.workforce} onChange={(e) => setField("workforce", e.target.value)} placeholder="e.g. WF-102" />
                </Field>
                <Field label="Cost Center">
                  <input className={inputCls} style={inputStyle} value={form.costCenter} onChange={(e) => setField("costCenter", e.target.value)} placeholder="e.g. 1000-2100" />
                </Field>
                <Field label="Cost Element">
                  <input className={inputCls} style={inputStyle} value={form.costElement} onChange={(e) => setField("costElement", e.target.value)} placeholder="e.g. 5100300" />
                </Field>
                <Field label="IO Number">
                  <input className={inputCls} style={inputStyle} value={form.ioNumber} onChange={(e) => setField("ioNumber", e.target.value)} placeholder="e.g. IO-250014" />
                </Field>
              </div>

              {/* ── Section: Ideas / Blockers / Next Steps — scoped to this release ── */}
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                Ideas · Blockers · Next Steps · Risks
              </p>

              {!editId ? (
                <p className="text-xs rounded-lg p-3" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
                  บันทึก Release นี้ก่อน แล้วค่อยกลับมาเพิ่ม Ideas / Blockers / Next Steps
                </p>
              ) : opsLoading ? (
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Ideas */}
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>💡 Ideas ({releaseIdeas.length})</p>
                    <div className="flex flex-col gap-1.5 mb-2">
                      {releaseIdeas.map((idea) => (
                        <div key={idea.id} className="flex items-center gap-2 text-xs bg-card rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--color-border)" }}>
                          <span className="flex-1 min-w-0 truncate" style={{ color: "var(--color-text-primary)" }}>{idea.title}</span>
                          <select
                            className="text-xs rounded border px-1.5 py-0.5"
                            style={inputStyle}
                            value={idea.status}
                            onChange={(e) => setIdeaStatus(idea.id, e.target.value)}
                          >
                            {IDEA_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <button type="button" onClick={() => deleteIdea(idea.id)} className="shrink-0" style={{ color: "var(--color-rag-red)" }}>✕</button>
                        </div>
                      ))}
                      {releaseIdeas.length === 0 && <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ยังไม่มีไอเดีย</p>}
                    </div>
                    <div className="flex gap-1.5">
                      <input className={inputCls} style={inputStyle} value={ideaDraft.title} onChange={(e) => setIdeaDraft((d) => ({ ...d, title: e.target.value }))} placeholder="ไอเดียใหม่…" />
                      <button type="button" onClick={addIdea} className={miniBtnCls} style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>+ เพิ่ม</button>
                    </div>
                  </div>

                  {/* Blockers */}
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>🚧 Blockers ({releaseBlockers.length})</p>
                    <div className="flex flex-col gap-1.5 mb-2">
                      {releaseBlockers.map((b) => (
                        <div key={b.id} className="flex items-center gap-2 text-xs bg-card rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--color-border)" }}>
                          <span className="shrink-0">{SEVERITY_OPTIONS.find((o) => o.value === b.severity)?.label.slice(0, 2) ?? ""}</span>
                          <span className="flex-1 min-w-0 truncate" style={{ color: "var(--color-text-primary)" }}>{b.description}</span>
                          <span className="shrink-0" style={{ color: "var(--color-text-muted)" }}>{b.owner}</span>
                          <button type="button" onClick={() => deleteBlocker(b.id)} className="shrink-0" style={{ color: "var(--color-rag-red)" }}>✕</button>
                        </div>
                      ))}
                      {releaseBlockers.length === 0 && <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ยังไม่มี Blocker</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                      <input className={inputCls} style={inputStyle} value={blockerDraft.description} onChange={(e) => setBlockerDraft((d) => ({ ...d, description: e.target.value }))} placeholder="รายละเอียด Blocker…" />
                      <input className={inputCls} style={inputStyle} value={blockerDraft.owner} onChange={(e) => setBlockerDraft((d) => ({ ...d, owner: e.target.value }))} placeholder="Owner" />
                    </div>
                    <div className="flex gap-1.5">
                      <select className={inputCls} style={inputStyle} value={blockerDraft.severity} onChange={(e) => setBlockerDraft((d) => ({ ...d, severity: e.target.value as any }))}>
                        {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <input type="date" className={inputCls} style={inputStyle} value={blockerDraft.dueDate} onChange={(e) => setBlockerDraft((d) => ({ ...d, dueDate: e.target.value }))} />
                      <button type="button" onClick={addBlocker} className={miniBtnCls} style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>+ เพิ่ม</button>
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>✅ Next Steps ({releaseNextSteps.length})</p>
                    <div className="flex flex-col gap-1.5 mb-2">
                      {releaseNextSteps.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 text-xs bg-card rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--color-border)", opacity: s.done ? 0.6 : 1 }}>
                          <input type="checkbox" checked={s.done} onChange={() => toggleNextStepDone(s)} className="w-3.5 h-3.5 accent-accent shrink-0" />
                          <span className="flex-1 min-w-0 truncate" style={{ color: "var(--color-text-primary)", textDecoration: s.done ? "line-through" : "none" }}>{s.description}</span>
                          <span className="shrink-0" style={{ color: "var(--color-text-muted)" }}>{s.owner}{s.effortDays != null ? ` · ${s.effortDays}d` : ""}</span>
                          <button type="button" onClick={() => deleteNextStep(s.id)} className="shrink-0" style={{ color: "var(--color-rag-red)" }}>✕</button>
                        </div>
                      ))}
                      {releaseNextSteps.length === 0 && <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ยังไม่มี Next Step</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                      <input className={inputCls} style={inputStyle} value={nextStepDraft.description} onChange={(e) => setNextStepDraft((d) => ({ ...d, description: e.target.value }))} placeholder="ขั้นตอนถัดไป…" />
                      <input className={inputCls} style={inputStyle} value={nextStepDraft.owner} onChange={(e) => setNextStepDraft((d) => ({ ...d, owner: e.target.value }))} placeholder="Owner" />
                    </div>
                    <div className="flex gap-1.5">
                      <select className={inputCls} style={inputStyle} value={nextStepDraft.priority} onChange={(e) => setNextStepDraft((d) => ({ ...d, priority: e.target.value as any }))}>
                        {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <input type="date" className={inputCls} style={inputStyle} value={nextStepDraft.dueDate} onChange={(e) => setNextStepDraft((d) => ({ ...d, dueDate: e.target.value }))} />
                      <input type="number" min={0} step={0.5} className={inputCls} style={inputStyle} value={nextStepDraft.effortDays} onChange={(e) => setNextStepDraft((d) => ({ ...d, effortDays: e.target.value }))} placeholder="Days" />
                      <button type="button" onClick={addNextStep} className={miniBtnCls} style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>+ เพิ่ม</button>
                    </div>
                  </div>

                  {/* Risks */}
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>⚠️ Risks ({releaseRisks.length})</p>
                    <div className="flex flex-col gap-1.5 mb-2">
                      {releaseRisks.map((risk) => (
                        <div key={risk.id} className="flex items-center gap-2 text-xs bg-card rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--color-border)" }}>
                          <span className="shrink-0" title="Likelihood">{SEVERITY_OPTIONS.find((o) => o.value === risk.likelihood)?.label.slice(0, 2) ?? ""}</span>
                          <span className="flex-1 min-w-0 truncate" style={{ color: "var(--color-text-primary)" }}>{risk.description}</span>
                          {risk.mitigation && <span className="shrink-0 italic" style={{ color: "var(--color-text-muted)" }}>↳ {risk.mitigation}</span>}
                          <button type="button" onClick={() => deleteRisk(risk.id)} className="shrink-0" style={{ color: "var(--color-rag-red)" }}>✕</button>
                        </div>
                      ))}
                      {releaseRisks.length === 0 && <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>ยังไม่มี Risk</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                      <input className={inputCls} style={inputStyle} value={riskDraft.description} onChange={(e) => setRiskDraft((d) => ({ ...d, description: e.target.value }))} placeholder="รายละเอียด Risk…" />
                      <input className={inputCls} style={inputStyle} value={riskDraft.mitigation} onChange={(e) => setRiskDraft((d) => ({ ...d, mitigation: e.target.value }))} placeholder="Mitigation (optional)" />
                    </div>
                    <div className="flex gap-1.5">
                      <select className={inputCls} style={inputStyle} value={riskDraft.likelihood} onChange={(e) => setRiskDraft((d) => ({ ...d, likelihood: e.target.value as any }))}>
                        {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>Likelihood: {o.label}</option>)}
                      </select>
                      <select className={inputCls} style={inputStyle} value={riskDraft.impact} onChange={(e) => setRiskDraft((d) => ({ ...d, impact: e.target.value as any }))}>
                        {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>Impact: {o.label}</option>)}
                      </select>
                      <button type="button" onClick={addRisk} className={miniBtnCls} style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>+ เพิ่ม</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 pb-2">
                <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--color-accent)", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving…" : editId ? "Save Changes" : "Create Release"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div className="fixed z-50 rounded-xl p-6 shadow-xl" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, background: "var(--color-card)" }}>
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--color-text-primary)" }}>Delete Release?</h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>This release record will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg text-sm border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--color-rag-red)" }}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
