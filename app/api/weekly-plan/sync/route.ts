import { NextRequest } from "next/server"
import { syncAutoItems } from "@/lib/weeklyPlan"
import { parseDateParam } from "@/lib/utils/date"

export async function POST(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week")
  const date = weekParam ? parseDateParam(weekParam) : new Date()
  if (isNaN(date.getTime())) {
    return Response.json({ error: "Invalid week date" }, { status: 400 })
  }
  const plan = await syncAutoItems(date)
  return Response.json(plan)
}
