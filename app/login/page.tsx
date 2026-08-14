"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { NexusIcon } from "@/components/ui/NexusIcon"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/dashboard"

  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ")
        setLoading(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <NexusIcon size={24} className="text-accent" />
          <span className="font-bold text-lg tracking-tight text-text-primary">NEXUS HUB</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-text-primary" htmlFor="password">
            รหัสผ่าน
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-accent"
            placeholder="••••••••"
          />
          {error && <p className="text-xs text-rag-red-text">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-2 w-full py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
