import { NextRequest } from "next/server"
import { syncAutoItems } from "@/lib/weeklyPlan"

export async function POST(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week") ?? new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    return Response.json({ error: "Invalid week date" }, { status: 400 })
  }
  const plan = await syncAutoItems(weekParam)
  return Response.json(plan)
}
