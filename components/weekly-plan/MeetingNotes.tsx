"use client"

import { useEffect, useRef, useState } from "react"

interface MeetingNotesProps {
  weekPlanId: string
  initialKickoffNotes: string | null
  initialWrapupNotes: string | null
}

const inputStyle = { borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-text-primary)" }

function saveNotes(weekPlanId: string, patch: { kickoffNotes?: string; wrapupNotes?: string }) {
  fetch("/api/weekly-plan/notes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weekPlanId, ...patch }),
  })
}

export function MeetingNotes({ weekPlanId, initialKickoffNotes, initialWrapupNotes }: MeetingNotesProps) {
  const [kickoff, setKickoff] = useState(initialKickoffNotes ?? "")
  const [wrapup, setWrapup] = useState(initialWrapupNotes ?? "")
  const [savedVisible, setSavedVisible] = useState(false)

  const kickoffRef = useRef(kickoff)
  const wrapupRef = useRef(wrapup)
  const kickoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Flush any pending autosave on unmount (e.g. switching weeks) so a note
    // typed just before navigating away isn't silently dropped — and since
    // this component is keyed by weekPlanId, the flush still targets the
    // correct (outgoing) week, never the one being switched to.
    return () => {
      if (kickoffTimer.current) {
        clearTimeout(kickoffTimer.current)
        saveNotes(weekPlanId, { kickoffNotes: kickoffRef.current })
      }
      if (wrapupTimer.current) {
        clearTimeout(wrapupTimer.current)
        saveNotes(weekPlanId, { wrapupNotes: wrapupRef.current })
      }
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current)
    }
  }, [weekPlanId])

  function showSaved() {
    setSavedVisible(true)
    if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current)
    savedFadeTimer.current = setTimeout(() => setSavedVisible(false), 2000)
  }

  function handleKickoffChange(value: string) {
    setKickoff(value)
    kickoffRef.current = value
    if (kickoffTimer.current) clearTimeout(kickoffTimer.current)
    kickoffTimer.current = setTimeout(() => {
      kickoffTimer.current = null
      saveNotes(weekPlanId, { kickoffNotes: value })
      showSaved()
    }, 800)
  }

  function handleWrapupChange(value: string) {
    setWrapup(value)
    wrapupRef.current = value
    if (wrapupTimer.current) clearTimeout(wrapupTimer.current)
    wrapupTimer.current = setTimeout(() => {
      wrapupTimer.current = null
      saveNotes(weekPlanId, { wrapupNotes: value })
      showSaved()
    }, 800)
  }

  function handleKickoffBlur() {
    if (kickoffTimer.current) {
      clearTimeout(kickoffTimer.current)
      kickoffTimer.current = null
      saveNotes(weekPlanId, { kickoffNotes: kickoff })
      showSaved()
    }
  }

  function handleWrapupBlur() {
    if (wrapupTimer.current) {
      clearTimeout(wrapupTimer.current)
      wrapupTimer.current = null
      saveNotes(weekPlanId, { wrapupNotes: wrapup })
      showSaved()
    }
  }

  return (
    <div className="rounded-xl border mt-4 p-4" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Meeting Notes</span>
        <span
          className="text-xs font-medium transition-opacity"
          style={{ color: "var(--color-rag-green-text)", opacity: savedVisible ? 1 : 0 }}
        >
          บันทึกแล้ว ✓
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>จันทร์ — kickoff</span>
          <textarea
            value={kickoff}
            onChange={(e) => handleKickoffChange(e.target.value)}
            onBlur={handleKickoffBlur}
            placeholder="บันทึกสรุปประชุม + สิ่งที่ตกลงกัน…"
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border outline-none focus:ring-2 resize-vertical"
            style={{ ...inputStyle, minHeight: 72 }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>ศุกร์ — wrap-up</span>
          <textarea
            value={wrapup}
            onChange={(e) => handleWrapupChange(e.target.value)}
            onBlur={handleWrapupBlur}
            placeholder="บันทึกสรุปประชุม + สิ่งที่ตกลงกัน…"
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border outline-none focus:ring-2 resize-vertical"
            style={{ ...inputStyle, minHeight: 72 }}
          />
        </div>
      </div>
    </div>
  )
}
