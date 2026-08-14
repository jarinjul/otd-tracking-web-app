import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE, authToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""

  if (!process.env.APP_PASSWORD || password !== process.env.APP_PASSWORD) {
    return Response.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, authToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })
  return res
}
