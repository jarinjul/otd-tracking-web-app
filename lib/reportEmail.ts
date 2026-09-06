import { prisma } from "@/lib/prisma"
import { getOrCreateWeekPlan, normalizeWeekStart } from "@/lib/weeklyPlan"
import { addDays } from "@/lib/utils/date"
import { PHASE_LABELS, type Phase } from "@/lib/types"

// Called through OpenRouter (not the Anthropic API directly) — model is the
// OpenRouter provider-prefixed slug. Kept as a single const so it's easy to bump later.
export const REPORT_MODEL = "anthropic/claude-opus-5"
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

export type ReportTone = "formal" | "concise"

export interface ReportEmailPayload {
  subject: string
  bodyHtml: string
  bodyText: string
}

/** Thrown when the requested week has no plan items and no meeting notes — route maps this to 422. */
export class EmptyWeekError extends Error {
  constructor() {
    super("empty_week")
    this.name = "EmptyWeekError"
  }
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
]

function formatThaiDateShort(date: Date): string {
  return `${date.getUTCDate()} ${THAI_MONTHS_SHORT[date.getUTCMonth()]}`
}

function formatThaiDateRange(start: Date, end: Date): string {
  const y1 = start.getUTCFullYear()
  const y2 = end.getUTCFullYear()
  const m1 = start.getUTCMonth()
  const m2 = end.getUTCMonth()

  if (y1 !== y2) {
    return `${formatThaiDateShort(start)} ${y1} – ${formatThaiDateShort(end)} ${y2}`
  }
  if (m1 !== m2) {
    return `${formatThaiDateShort(start)} – ${formatThaiDateShort(end)} ${y2}`
  }
  return `${start.getUTCDate()}–${end.getUTCDate()} ${THAI_MONTHS_SHORT[m2]} ${y2}`
}

// ─── Data gathering ──────────────────────────────────────────────────────────

interface ProjectHealthEntry {
  version: string | null
  ragStatus: string | null
  phase: string | null
  progressPercent: number | null
  isDelayed: boolean
  delayDays: number | null
  needsDecision: boolean
  decisionNote: string | null
}

interface PromptChecklistItem {
  text: string
  done: boolean
}

interface PromptPlanItem {
  title: string
  status: string
  itemType: string | null
  owner: string | null
  note: string | null
  checklist: PromptChecklistItem[]
}

interface ProjectGroup {
  projectName: string | null // null → "อื่น ๆ"
  health: ProjectHealthEntry | null
  items: PromptPlanItem[]
}

interface InterruptEntry {
  date: Date
  personName: string
  source: string
  hours: number
}

export interface GatheredWeekData {
  weekStart: Date
  weekEnd: Date
  totals: { total: number; done: number; pending: number; carriedOver: number }
  groups: ProjectGroup[]
  kickoffNotes: string | null
  wrapupNotes: string | null
  interrupts: InterruptEntry[]
  interruptHours: number
}

interface RawReleaseForHealth {
  id: string
  version: string
  status: string
  ragStatus: string
  phase: string
  progressPercent: number
  isDelayed: boolean
  delayDays: number | null
  needsDecision: boolean
  decisionNote: string | null
  startDate: Date | null
}

// Same "which release represents the project's current health" rule as
// WeeklyPlanClient.tsx's pickActiveRelease — duplicated here since this runs
// server-side inside a different module without pulling in client code.
function pickActiveRelease(releases: RawReleaseForHealth[]): RawReleaseForHealth | null {
  if (releases.length === 0) return null
  const rank = (r: RawReleaseForHealth) => (r.status === "in_progress" ? 0 : r.status === "planned" ? 1 : r.status === "deployed" ? 2 : 3)
  return [...releases].sort((a, b) => {
    const rd = rank(a) - rank(b)
    if (rd !== 0) return rd
    const at = a.startDate ? a.startDate.getTime() : 0
    const bt = b.startDate ? b.startDate.getTime() : 0
    return bt - at
  })[0]
}

// Same "most urgent first" ranking as ProjectHealthTable.tsx, reused here so
// the AI sees critical projects before healthy ones in the prompt text.
function healthUrgencyRank(h: ProjectHealthEntry | null): number {
  if (!h) return 4
  if (h.ragStatus === "red") return 0
  if (h.isDelayed || h.needsDecision) return 1
  if (h.ragStatus === "amber") return 2
  return 3
}

export async function gatherWeekReportData(weekParam: string): Promise<GatheredWeekData | null> {
  const plan = await getOrCreateWeekPlan(weekParam)
  const weekStartDate = normalizeWeekStart(weekParam)
  const weekEndDate = addDays(weekStartDate, 6)

  if (plan.items.length === 0 && !plan.kickoffNotes && !plan.wrapupNotes) {
    return null
  }

  const [projects, interruptRows] = await Promise.all([
    prisma.project.findMany({ include: { releases: true } }),
    prisma.interruptTask.findMany({
      where: { date: { gte: weekStartDate, lte: weekEndDate } },
      include: { person: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
  ])

  const healthByName = new Map<string, ProjectHealthEntry>()
  for (const p of projects) {
    const active = pickActiveRelease(p.releases as unknown as RawReleaseForHealth[])
    healthByName.set(p.name, {
      version: active?.version ?? null,
      ragStatus: active?.ragStatus ?? null,
      phase: active?.phase ?? null,
      progressPercent: active?.progressPercent ?? null,
      isDelayed: active?.isDelayed ?? false,
      delayDays: active?.delayDays ?? null,
      needsDecision: active?.needsDecision ?? false,
      decisionNote: active?.decisionNote ?? null,
    })
  }

  const groupsByKey = new Map<string | null, ProjectGroup>()
  for (const item of plan.items) {
    const key = item.projectName ?? null
    let group = groupsByKey.get(key)
    if (!group) {
      group = { projectName: key, health: key ? healthByName.get(key) ?? null : null, items: [] }
      groupsByKey.set(key, group)
    }
    group.items.push({
      title: item.title,
      status: item.status,
      itemType: item.itemType,
      owner: item.owner,
      note: item.note,
      checklist: item.checklist.map((c) => ({ text: c.text, done: c.done })),
    })
  }

  const groups = [...groupsByKey.values()].sort((a, b) => {
    // "อื่น ๆ" (null projectName) always sorts last, regardless of health.
    if (a.projectName === null) return 1
    if (b.projectName === null) return -1
    return healthUrgencyRank(a.health) - healthUrgencyRank(b.health)
  })

  const done = plan.items.filter((i) => i.status === "done").length
  const carriedOver = plan.items.filter((i) => i.status === "carried_over").length
  const pending = plan.items.length - done - carriedOver

  const interrupts: InterruptEntry[] = interruptRows.map((i) => ({
    date: i.date,
    personName: i.person.name,
    source: i.source,
    hours: i.hours,
  }))
  const interruptHours = interrupts.reduce((sum, i) => sum + i.hours, 0)

  return {
    weekStart: weekStartDate,
    weekEnd: weekEndDate,
    totals: { total: plan.items.length, done, pending, carriedOver },
    groups,
    kickoffNotes: plan.kickoffNotes,
    wrapupNotes: plan.wrapupNotes,
    interrupts,
    interruptHours,
  }
}

// ─── Prompt construction ─────────────────────────────────────────────────────

function formatHealthSuffix(h: ProjectHealthEntry | null): string {
  if (!h) return ""
  const parts: string[] = []
  if (h.version) parts.push(h.version)
  if (h.ragStatus) parts.push(`RAG: ${h.ragStatus}`)
  if (h.phase) parts.push(`Phase: ${PHASE_LABELS[h.phase as Phase] ?? h.phase}`)
  if (h.progressPercent != null) parts.push(`${h.progressPercent}%`)
  if (h.isDelayed) parts.push(h.delayDays != null ? `delayed ${h.delayDays} วัน` : "delayed")
  if (h.needsDecision) parts.push(h.decisionNote ? `needs decision: "${h.decisionNote}"` : "needs decision")
  if (parts.length === 0) return ""
  return ` (${parts.join(", ")})`
}

function buildPromptText(data: GatheredWeekData): string {
  const lines: string[] = []

  lines.push(`สัปดาห์: ${formatThaiDateRange(data.weekStart, data.weekEnd)}`)
  lines.push(
    `สรุป: ทั้งหมด ${data.totals.total} | เสร็จ ${data.totals.done} | ค้าง ${data.totals.pending} | ยกไปสัปดาห์หน้า ${data.totals.carriedOver}`
  )

  for (const group of data.groups) {
    lines.push("")
    if (group.projectName === null) {
      lines.push("## อื่น ๆ")
    } else {
      lines.push(`## โปรเจกต์: ${group.projectName}${formatHealthSuffix(group.health)}`)
    }
    for (const item of group.items) {
      const ownerPart = item.owner ? ` (owner: ${item.owner})` : ""
      lines.push(`- [${item.status}] ${item.title}${ownerPart}`)
      if (item.note) lines.push(`  - note: ${item.note}`)
      if (item.checklist.length > 0) {
        const checklistText = item.checklist.map((c) => `[${c.done ? "x" : " "}] ${c.text}`).join(", ")
        lines.push(`  - checklist: ${checklistText}`)
      }
    }
  }

  if (data.kickoffNotes || data.wrapupNotes) {
    lines.push("")
    lines.push("## Meeting Notes")
    if (data.kickoffNotes) lines.push(`จันทร์ (kickoff): ${data.kickoffNotes}`)
    if (data.wrapupNotes) lines.push(`ศุกร์ (wrap-up): ${data.wrapupNotes}`)
  }

  if (data.interrupts.length > 0) {
    lines.push("")
    lines.push(`## งานแทรก (รวม ${data.interruptHours} ชม.)`)
    for (const i of data.interrupts) {
      lines.push(`- ${formatThaiDateShort(i.date)} · ${i.personName} · ${i.source} · ${i.hours}h`)
    }
  }

  return lines.join("\n")
}

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT_TEMPLATE = `คุณคือผู้ช่วยของ Tech Lead ทีมพัฒนาซอฟต์แวร์ หน้าที่คือเรียบเรียง "อีเมลรายงานประจำสัปดาห์"
ภาษาไทยสำหรับส่งหัวหน้า จากข้อมูลดิบที่ให้มา

โครงสร้างอีเมล (bodyHtml ใช้ <p>, <h4>, <ul>/<li>, <strong> เท่านั้น — ไม่มี CSS/inline style):
1. คำขึ้นต้น "เรียน …" + ประโยคเปิด 1 บรรทัดบอกช่วงสัปดาห์
2. "ภาพรวม" — 2-3 ประโยค: จำนวนงานเสร็จ/ค้าง/ยกไป, ชั่วโมงงานแทรก, ประเด็นใหญ่สุดของสัปดาห์
3. รายละเอียดรายโปรเจกต์ (เรียงโปรเจกต์ที่มีปัญหา/critical ก่อน) — แต่ละโปรเจกต์:
   หัวข้อ = ชื่อ + version + phase + progress, ตามด้วย bullet สิ่งที่เสร็จ (✅) / กำลังทำ / ติดขัด
4. "ประเด็นจากที่ประชุม" — สรุปจาก kickoff/wrap-up notes (ข้ามหัวข้อนี้ถ้าไม่มี notes)
5. "สิ่งที่ต้องขอการตัดสินใจ" — จาก needsDecision/decisionNote (ข้ามถ้าไม่มี)
6. คำลงท้าย "จึงเรียนมาเพื่อโปรดทราบ / ขอบคุณครับ"

กติกา:
- เขียนจากข้อมูลที่ให้เท่านั้น ห้ามแต่งตัวเลขหรือเหตุการณ์เพิ่ม
- ถ้าข้อมูลส่วนไหนว่าง ให้ข้ามหัวข้อนั้น ไม่ต้องเขียนว่า "ไม่มีข้อมูล"
- โทน {tone}: "formal" = ภาษาทางการ สุภาพ ครบถ้วน | "concise" = กระชับ bullet สั้น อ่านจบใน 1 นาที
- subject รูปแบบ: [Weekly Report] ทีมพัฒนา — สัปดาห์ {ช่วงวันที่ภาษาไทย}
- bodyText = เนื้อหาเดียวกับ bodyHtml แบบ plain text (ใช้ - นำ bullet)

ตอบกลับเป็น JSON เท่านั้น ตาม schema {"subject": string, "bodyHtml": string, "bodyText": string} — ห้ามมีข้อความอื่นนอก JSON`

// ─── Claude call ─────────────────────────────────────────────────────────────

function isReportEmailPayload(value: unknown): value is ReportEmailPayload {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return typeof v.subject === "string" && typeof v.bodyHtml === "string" && typeof v.bodyText === "string"
}

interface OpenRouterMessage {
  content?: string | null
}
interface OpenRouterChoice {
  message?: OpenRouterMessage
  finish_reason?: string
}
interface OpenRouterResponse {
  choices?: OpenRouterChoice[]
  error?: { message?: string; code?: number | string }
}

export async function generateReportEmail(weekParam: string, tone: ReportTone): Promise<ReportEmailPayload> {
  const gathered = await gatherWeekReportData(weekParam)
  if (!gathered) throw new EmptyWeekError()

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ใน .env")
  }

  const promptText = buildPromptText(gathered)
  const system = SYSTEM_PROMPT_TEMPLATE.replace("{tone}", tone)

  let res: Response
  try {
    res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Attribution headers OpenRouter uses for its app-ranking pages — optional but recommended.
        "HTTP-Referer": "https://zenith.internal",
        "X-Title": "Zenith Weekly Plan",
      },
      body: JSON.stringify({
        model: REPORT_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: promptText },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "report_email",
            strict: true,
            schema: {
              type: "object",
              properties: {
                subject: { type: "string" },
                bodyHtml: { type: "string" },
                bodyText: { type: "string" },
              },
              required: ["subject", "bodyHtml", "bodyText"],
              additionalProperties: false,
            },
          },
        },
      }),
    })
  } catch (err) {
    throw new Error(err instanceof Error ? `เรียก OpenRouter ไม่สำเร็จ: ${err.message}` : "เรียก OpenRouter ไม่สำเร็จ")
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error("ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ใน .env หรือ API key ไม่ถูกต้อง")
  }

  let data: OpenRouterResponse
  try {
    data = await res.json()
  } catch {
    throw new Error(`เรียก OpenRouter ไม่สำเร็จ (${res.status})`)
  }

  if (!res.ok) {
    throw new Error(`เรียก OpenRouter ไม่สำเร็จ (${res.status}): ${data.error?.message ?? "unknown error"}`)
  }

  const choice = data.choices?.[0]
  // OpenAI-compatible finish_reason — "content_filter" is the closest equivalent to Anthropic's refusal stop_reason.
  if (choice?.finish_reason === "content_filter") {
    throw new Error("AI ปฏิเสธการสร้างอีเมลนี้ ลองกด Generate ใหม่อีกครั้ง")
  }

  const content = choice?.message?.content
  if (!content) {
    throw new Error("ไม่ได้รับเนื้อหาอีเมลจาก AI")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("แปลงผลลัพธ์จาก AI เป็น JSON ไม่สำเร็จ")
  }

  if (!isReportEmailPayload(parsed)) {
    throw new Error("AI ตอบกลับข้อมูลไม่ครบถ้วน")
  }

  return parsed
}
