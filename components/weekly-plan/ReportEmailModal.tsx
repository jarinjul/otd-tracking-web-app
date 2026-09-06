"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { X, Sparkles, Copy, RefreshCw, Check, AlertTriangle, Inbox } from "lucide-react"
import { toDateParam, formatDate } from "@/lib/utils/date"
import type { ReportTone, ReportEmailPayload } from "@/lib/reportEmail"

type ModalState = "loading" | "success" | "error" | "empty"

interface ReportEmailModalProps {
  open: boolean
  weekStart: Date
  weekEnd: Date
  onClose: () => void
  /** True when the parent already knows this week has no items/notes — skips the API call entirely. */
  initialEmpty: boolean
  onLoadingChange?: (loading: boolean) => void
}

const LOADING_STEPS = ["กำลังรวบรวมแผนงาน…", "อ่าน Meeting Notes…", "AI กำลังเรียบเรียงอีเมล…"]

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 19, 28, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: 16,
}

// Minimal allow-list sanitize: bodyHtml is model output constrained by the system prompt to
// <p>/<h4>/<ul>/<li>/<strong>, but we still strip anything script-like before rendering it.
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\s*script[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
}

export function ReportEmailModal({ open, weekStart, weekEnd, onClose, initialEmpty, onLoadingChange }: ReportEmailModalProps) {
  const [fetchState, setFetchState] = useState<Exclude<ModalState, "empty">>("loading")
  // "empty" is a pure function of the prop the parent already computed — no need to sync it into state.
  const state: ModalState = initialEmpty ? "empty" : fetchState
  const [tone, setTone] = useState<ReportTone>("formal")
  const [result, setResult] = useState<ReportEmailPayload | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [stepIndex, setStepIndex] = useState(0)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastText, setToastText] = useState("")

  const abortRef = useRef<AbortController | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const weekParam = toDateParam(weekStart)

  function showToast(text: string) {
    setToastText(text)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 2600)
  }

  function startFetch(toneToUse: ReportTone) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setFetchState("loading")
    setStepIndex(0)
    setErrorMessage("")

    fetch("/api/weekly-plan/report-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: weekParam, tone: toneToUse }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (res.ok && data) {
          setResult(data)
          setFetchState("success")
        } else if (res.status === 422) {
          setErrorMessage("สัปดาห์นี้ยังไม่มีข้อมูล")
          setFetchState("error")
        } else {
          setErrorMessage((data && data.message) || "สร้างอีเมลไม่สำเร็จ ลองอีกครั้ง")
          setFetchState("error")
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setErrorMessage("เชื่อมต่อไม่สำเร็จ ลองอีกครั้ง")
        setFetchState("error")
      })
  }

  // Kick off generation whenever the modal opens for a (possibly new, non-empty) week — and abort
  // the in-flight request if the modal closes, the week changes, or it unmounts.
  useEffect(() => {
    if (!open || initialEmpty) return
    // Reset to the default tone for a fresh open — this is the fetch-triggering
    // effect itself, not a derived-value sync, so resetting state here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTone("formal")
    startFetch("formal")
    return () => {
      abortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, weekParam, initialEmpty])

  useEffect(() => {
    onLoadingChange?.(open && state === "loading")
  }, [open, state, onLoadingChange])

  useEffect(() => {
    if (state !== "loading") return
    const id = setInterval(() => setStepIndex((i) => (i + 1) % LOADING_STEPS.length), 900)
    return () => clearInterval(id)
  }, [state])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  async function writeToClipboard(payload: ReportEmailPayload) {
    const plain = `${payload.subject}\n\n${payload.bodyText}`
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const item = new ClipboardItem({
          "text/html": new Blob([sanitizeHtml(payload.bodyHtml)], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        })
        await navigator.clipboard.write([item])
      } else {
        await navigator.clipboard.writeText(plain)
      }
      showToast("คัดลอกอีเมลแล้ว — วางใน Outlook/Gmail ได้เลย ✓")
    } catch {
      try {
        await navigator.clipboard.writeText(plain)
        showToast("คัดลอกอีเมลแล้ว — วางใน Outlook/Gmail ได้เลย ✓")
      } catch {
        showToast("คัดลอกไม่สำเร็จ ลองอีกครั้ง")
      }
    }
  }

  async function copySubject() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.subject)
      showToast("คัดลอกหัวข้ออีเมลแล้ว ✓")
    } catch {
      showToast("คัดลอกไม่สำเร็จ ลองอีกครั้ง")
    }
  }

  if (!open) return null

  return (
    <>
      {/* Tailwind's preflight strips default list/heading spacing — restore it just for the
          AI-generated preview, which only ever contains the tags allowed by the system prompt. */}
      <style>{`
        .report-email-preview p { margin: 0 0 10px; }
        .report-email-preview p:last-child { margin-bottom: 0; }
        .report-email-preview h4 { font-weight: 600; margin: 14px 0 6px; }
        .report-email-preview h4:first-child { margin-top: 0; }
        .report-email-preview ul { list-style: disc; padding-left: 1.25em; margin: 0 0 10px; }
        .report-email-preview li { margin: 2px 0; }
        .report-email-preview strong { font-weight: 600; }
      `}</style>
      <div style={overlayStyle} onMouseDown={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generate Report Email"
        onMouseDown={(e) => e.stopPropagation()}
        className="rounded-xl border w-full flex flex-col relative"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
          maxWidth: 620,
          maxHeight: "min(80vh, 720px)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: "var(--color-accent)" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Generate Report Email
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {formatDate(weekStart)} – {formatDate(weekEnd)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {state === "loading" && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <div
                className="animate-spin rounded-full"
                style={{ width: 28, height: 28, border: "3px solid var(--color-border)", borderTopColor: "var(--color-accent)" }}
              />
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {LOADING_STEPS[stepIndex]}
              </p>
              <div className="w-full flex flex-col gap-2 mt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded animate-pulse"
                    style={{ height: 12, background: "var(--color-border-muted)", width: i === 2 ? "60%" : "100%" }}
                  />
                ))}
              </div>
            </div>
          )}

          {state === "empty" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Inbox size={28} style={{ color: "var(--color-text-muted)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                สัปดาห์นี้ยังไม่มีข้อมูล
              </p>
              <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
                ยังไม่มีรายการแผนงานหรือ Meeting Notes สำหรับสัปดาห์นี้ — เพิ่มข้อมูลก่อนแล้วลองใหม่อีกครั้ง
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <AlertTriangle size={28} style={{ color: "var(--color-rag-red-text)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                สร้างอีเมลไม่สำเร็จ
              </p>
              <p className="text-xs max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                {errorMessage}
              </p>
              <button
                onClick={() => startFetch(tone)}
                className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--color-accent)" }}
              >
                <RefreshCw size={14} />
                ลองอีกครั้ง
              </button>
            </div>
          )}

          {state === "success" && result && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Subject
                </p>
                <div
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                >
                  <span className="truncate">{result.subject}</span>
                  <button
                    onClick={copySubject}
                    aria-label="คัดลอกหัวข้อ"
                    className="p-1 rounded hover:opacity-70 transition-opacity shrink-0"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  เนื้อหาอีเมล
                </p>
                <div
                  className="px-3.5 py-3 rounded-lg border text-sm overflow-y-auto report-email-preview"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)", maxHeight: 320 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(result.bodyHtml) }}
                />
              </div>
            </div>
          )}
        </div>

        {state === "success" && result && (
          <div
            className="flex items-center justify-between gap-3 px-5 py-3.5 border-t shrink-0 flex-wrap"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                โทน
              </span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ReportTone)}
                className="text-xs px-2 py-1.5 rounded-lg border outline-none"
                style={{ borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-text-primary)" }}
              >
                <option value="formal">ทางการ</option>
                <option value="concise">กระชับ</option>
              </select>
              <button
                onClick={() => startFetch(tone)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                <RefreshCw size={13} />
                Generate ใหม่
              </button>
            </div>
            <button
              onClick={() => writeToClipboard(result)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--color-accent)" }}
            >
              <Copy size={14} />
              Copy อีเมลทั้งหมด
            </button>
          </div>
        )}

        {toastVisible && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-4 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg"
            style={{ background: "var(--color-accent-dark)", color: "#fff" }}
          >
            <Check size={13} />
            {toastText}
          </div>
        )}
      </div>
      </div>
    </>
  )
}
