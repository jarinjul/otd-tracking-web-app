import { NextRequest } from "next/server"
import { getOrCreateWeekPlan } from "@/lib/weeklyPlan"
import { parseDateParam } from "@/lib/utils/date"

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week")
  const date = weekParam ? parseDateParam(weekParam) : new Date()
  if (isNaN(date.getTime())) {
    return Response.json({ error: "Invalid week date" }, { status: 400 })
  }
  const plan = await getOrCreateWeekPlan(date)
  return Response.json(plan)
}
