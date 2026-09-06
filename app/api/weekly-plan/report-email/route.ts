import { NextRequest } from "next/server"
import { generateReportEmail, EmptyWeekError, type ReportTone } from "@/lib/reportEmail"

// AI generation can take a while — guard against the serverless default timeout.
// Measured against real data via OpenRouter: single generations regularly take 80-120s
// (OpenRouter's routing adds meaningful latency on top of the model call itself), so 60s
// was cutting it close. NOTE: on Vercel, this value is capped by the plan (Hobby: 60s hard
// cap regardless of this setting; Pro: up to 300s; Enterprise: up to 900s) — if deploying on
// Hobby, this feature will still time out in production and either the plan needs upgrading
// or the model/provider needs to be swapped for a faster one.
export const maxDuration = 300

const WEEK_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidWeekParam(week: string): boolean {
  if (!WEEK_PARAM_RE.test(week)) return false
  const [y, m, d] = week.split("-").map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid_week" }, { status: 400 })
  }

  const week = (body as { week?: unknown } | null)?.week
  const toneRaw = (body as { tone?: unknown } | null)?.tone

  if (typeof week !== "string" || !isValidWeekParam(week)) {
    return Response.json({ error: "invalid_week" }, { status: 400 })
  }

  const tone: ReportTone = toneRaw === "concise" ? "concise" : "formal"

  try {
    const result = await generateReportEmail(week, tone)
    return Response.json(result, { status: 200 })
  } catch (err) {
    if (err instanceof EmptyWeekError) {
      return Response.json({ error: "empty_week" }, { status: 422 })
    }
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่คาดคิด"
    return Response.json({ error: "generation_failed", message }, { status: 500 })
  }
}
