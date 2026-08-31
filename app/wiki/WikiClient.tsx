"use client"

import { useRef, useState } from "react"
import {
  Plus,
  Upload,
  Trash2,
  Pencil,
  Check,
  X,
  FileCode,
  ExternalLink,
  Maximize2,
  Minimize2,
} from "lucide-react"

type WikiEntry = {
  id: string
  topicId: string
  title: string
  html: string
  sourceName: string | null
  sortOrder: number
  createdAt: string | Date
  updatedAt: string | Date
}

type WikiTopic = {
  id: string
  title: string
  sortOrder: number
  createdAt: string | Date
  updatedAt: string | Date
  entries: WikiEntry[]
}

const inputStyle = {
  borderColor: "var(--color-border)",
  background: "var(--color-card)",
  color: "var(--color-text-primary)",
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-CA")
}

function stripExt(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "")
}

export function WikiClient({ initialTopics }: { initialTopics: WikiTopic[] }) {
  const [topics, setTopics] = useState<WikiTopic[]>(initialTopics)
  const [selectedId, setSelectedId] = useState<string | null>(initialTopics[0]?.id ?? null)

  const [addingTopic, setAddingTopic] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState("")
  const [busy, setBusy] = useState(false)

  const [renameTopicId, setRenameTopicId] = useState<string | null>(null)
  const [renameTopicValue, setRenameTopicValue] = useState("")

  const [renameEntryId, setRenameEntryId] = useState<string | null>(null)
  const [renameEntryValue, setRenameEntryValue] = useState("")

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedTopic = topics.find((t) => t.id === selectedId) ?? null

  function patchTopic(updated: WikiTopic) {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? { ...updated } : t)))
  }

  async function handleAddTopic() {
    const title = newTopicTitle.trim()
    if (!title) return
    setBusy(true)
    try {
      const res = await fetch("/api/wiki/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (res.ok) {
        const created: WikiTopic = await res.json()
        setTopics((prev) => [...prev, created])
        setSelectedId(created.id)
        setNewTopicTitle("")
        setAddingTopic(false)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleRenameTopic(id: string) {
    const title = renameTopicValue.trim()
    if (!title) return
    const res = await fetch(`/api/wiki/topics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      const updated: WikiTopic = await res.json()
      patchTopic(updated)
    }
    setRenameTopicId(null)
  }

  async function handleDeleteTopic(id: string) {
    const topic = topics.find((t) => t.id === id)
    if (!topic) return
    if (!confirm(`ลบหัวข้อ "${topic.title}" และเอกสารทั้งหมด ${topic.entries.length} รายการ?`)) return
    setTopics((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (selectedId === id) setSelectedId(next[0]?.id ?? null)
      return next
    })
    await fetch(`/api/wiki/topics/${id}`, { method: "DELETE" })
  }

  async function handleImportFile(file: File) {
    if (!selectedTopic) return
    setImportError(null)
    const html = await file.text()
    if (!html.trim()) {
      setImportError("ไฟล์ว่างเปล่า")
      return
    }
    const defaultTitle = stripExt(file.name) || "Untitled"
    const title = window.prompt("ชื่อเอกสาร", defaultTitle)
    if (title === null) return
    setBusy(true)
    try {
      const res = await fetch("/api/wiki/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopic.id,
          title: title.trim() || defaultTitle,
          html,
          sourceName: file.name,
        }),
      })
      if (res.ok) {
        const created: WikiEntry = await res.json()
        setTopics((prev) =>
          prev.map((t) =>
            t.id === selectedTopic.id ? { ...t, entries: [...t.entries, created] } : t
          )
        )
      } else {
        const err = await res.json().catch(() => ({}))
        setImportError(err.error ?? "อัปโหลดไม่สำเร็จ")
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleRenameEntry(entry: WikiEntry) {
    const title = renameEntryValue.trim()
    if (!title) return
    const res = await fetch(`/api/wiki/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      const updated: WikiEntry = await res.json()
      setTopics((prev) =>
        prev.map((t) =>
          t.id === updated.topicId
            ? { ...t, entries: t.entries.map((e) => (e.id === updated.id ? updated : e)) }
            : t
        )
      )
    }
    setRenameEntryId(null)
  }

  async function handleDeleteEntry(entry: WikiEntry) {
    if (!confirm(`ลบเอกสาร "${entry.title}"?`)) return
    setTopics((prev) =>
      prev.map((t) =>
        t.id === entry.topicId ? { ...t, entries: t.entries.filter((e) => e.id !== entry.id) } : t
      )
    )
    await fetch(`/api/wiki/entries/${entry.id}`, { method: "DELETE" })
  }

  function openInNewTab(entry: WikiEntry) {
    const blob = new Blob([entry.html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Wiki</h1>
        <p className="text-text-muted mt-1">
          คลังความรู้ของทีม — สร้างหัวข้อ แล้ว import ไฟล์ HTML ที่ทำไว้เข้ามาเก็บ
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Sidebar: topics ─────────────────────────────────────────── */}
        <aside className="w-64 shrink-0">
          <div className="rounded-card border border-border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Topics</p>
            </div>
            <ul>
              {topics.length === 0 && (
                <li className="px-3 py-4 text-xs text-text-muted">ยังไม่มีหัวข้อ</li>
              )}
              {topics.map((t) => {
                const active = t.id === selectedId
                return (
                  <li
                    key={t.id}
                    className="border-b last:border-b-0 group"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    {renameTopicId === t.id ? (
                      <div className="flex items-center gap-1 px-2 py-1.5">
                        <input
                          autoFocus
                          value={renameTopicValue}
                          onChange={(e) => setRenameTopicValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameTopic(t.id)
                            if (e.key === "Escape") setRenameTopicId(null)
                          }}
                          className="flex-1 min-w-0 px-2 py-1 text-sm rounded border"
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameTopic(t.id)}
                          className="p-1 text-text-muted hover:text-rag-green-text"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenameTopicId(null)}
                          className="p-1 text-text-muted hover:text-rag-red-text"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-1 px-3 py-2 cursor-pointer ${
                          active ? "bg-accent-light" : "hover:bg-surface"
                        }`}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <span
                          className={`flex-1 min-w-0 truncate text-sm ${
                            active ? "font-semibold text-text-primary" : "text-text-primary"
                          }`}
                          title={t.title}
                        >
                          {t.title}
                        </span>
                        <span className="text-[10px] text-text-muted shrink-0">{t.entries.length}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenameTopicId(t.id)
                            setRenameTopicValue(t.title)
                          }}
                          className="p-0.5 text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                          title="เปลี่ยนชื่อ"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTopic(t.id)
                          }}
                          className="p-0.5 text-text-muted hover:text-rag-red-text opacity-0 group-hover:opacity-100 transition-opacity"
                          title="ลบหัวข้อ"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="p-2 border-t" style={{ borderColor: "var(--color-border)" }}>
              {addingTopic ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    placeholder="ชื่อหัวข้อใหม่"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTopic()
                      if (e.key === "Escape") {
                        setAddingTopic(false)
                        setNewTopicTitle("")
                      }
                    }}
                    className="flex-1 min-w-0 px-2 py-1 text-sm rounded border"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={handleAddTopic}
                    disabled={busy}
                    className="p-1 text-text-muted hover:text-rag-green-text disabled:opacity-50"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingTopic(false)
                      setNewTopicTitle("")
                    }}
                    className="p-1 text-text-muted hover:text-rag-red-text"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTopic(true)}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm font-medium rounded-lg text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  <Plus size={14} /> Add topic
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main: entries of the selected topic ──────────────────────── */}
        <section className="flex-1 min-w-0">
          {!selectedTopic ? (
            <div className="rounded-card border border-border bg-card p-10 text-center text-text-muted text-sm">
              สร้างหัวข้อแรกทางซ้ายเพื่อเริ่มต้น
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-text-primary truncate">{selectedTopic.title}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,text/html"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleImportFile(f)
                      e.target.value = ""
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-50"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <Upload size={14} /> Import HTML file
                  </button>
                </div>
              </div>

              {importError && (
                <div className="mb-4 px-3 py-2 rounded-lg text-sm bg-rag-red-light text-rag-red-text">
                  {importError}
                </div>
              )}

              {selectedTopic.entries.length === 0 ? (
                <div className="rounded-card border border-dashed border-border bg-card p-10 text-center">
                  <FileCode size={28} className="mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">
                    ยังไม่มีเอกสารในหัวข้อนี้ — กด <span className="font-medium">Import HTML file</span> เพื่อเพิ่ม
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {selectedTopic.entries.map((entry) => {
                    const isExpanded = expanded.has(entry.id)
                    return (
                      <div
                        key={entry.id}
                        className="rounded-card border border-border bg-card overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-2 px-4 py-2.5 border-b"
                          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                        >
                          {renameEntryId === entry.id ? (
                            <>
                              <input
                                autoFocus
                                value={renameEntryValue}
                                onChange={(e) => setRenameEntryValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameEntry(entry)
                                  if (e.key === "Escape") setRenameEntryId(null)
                                }}
                                className="flex-1 min-w-0 px-2 py-1 text-sm rounded border"
                                style={inputStyle}
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameEntry(entry)}
                                className="p-1 text-text-muted hover:text-rag-green-text"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenameEntryId(null)}
                                className="p-1 text-text-muted hover:text-rag-red-text"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">
                                  {entry.title}
                                </p>
                                <p className="text-[11px] text-text-muted truncate">
                                  {entry.sourceName ? `${entry.sourceName} · ` : ""}
                                  {fmtDate(entry.createdAt)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleExpanded(entry.id)}
                                className="p-1 text-text-muted hover:text-text-primary"
                                title={isExpanded ? "ย่อ" : "ขยาย"}
                              >
                                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => openInNewTab(entry)}
                                className="p-1 text-text-muted hover:text-text-primary"
                                title="เปิดในแท็บใหม่"
                              >
                                <ExternalLink size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRenameEntryId(entry.id)
                                  setRenameEntryValue(entry.title)
                                }}
                                className="p-1 text-text-muted hover:text-text-primary"
                                title="เปลี่ยนชื่อ"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(entry)}
                                className="p-1 text-text-muted hover:text-rag-red-text"
                                title="ลบ"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                        <iframe
                          title={entry.title}
                          srcDoc={entry.html}
                          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                          className="w-full block bg-white"
                          style={{ height: isExpanded ? 1200 : 460, border: 0 }}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
