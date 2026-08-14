import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_COOKIE, authToken } from "@/lib/auth"

const PUBLIC_PATHS = ["/login", "/api/auth/login"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value
  if (cookie && cookie === authToken()) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
