"use client"

import { useEffect, useState, useCallback } from "react"
import type { Project } from "@/lib/types"
import { Avatar } from "@/components/ui/Avatar"
import { cropSquareImage, AVATAR_MAX_CHARS } from "@/lib/utils/image"

// ─── Helpers ────────────────────────────────────────────────────────────────

function arrToInput(arr: string[] | null | undefined): string {
  return (arr ?? []).join(", ")
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjectRow = Project & { _count?: { teamMembers: number } }

const STRATEGIC_BUCKET_OPTIONS = [
  { value: "FOCUS",       label: "Focus (Customer-active)",     desc: "ซอฟต์แวร์ตัวเก่งสร้างมูลค่าหลัก" },
  { value: "NEW_PRODUCT", label: "New Product",                 desc: "ซอฟต์แวร์ตัวใหม่แกะกล่อง" },
  { value: "REVAMP",      label: "Revamp Plan",                 desc: "ปรับปรุง/รื้อระบบเก่าครั้งใหญ่" },
  { value: "EXIT",        label: "Exit Plan",                   desc: "เตรียมโละทิ้ง ปิดตัว หรือย้ายระบบ" },
  { value: "INFRA",       label: "Infrastructure & Enabler",    desc: "งานสถาปัตยกรรม เทคโนโลยี และการวางระบบหลังบ้าน" },
  { value: "KTLO",        label: "Maintenance / KTLO",          desc: "งานเลี้ยงระบบเดิม แก้ Bug ทั่วไป ปรับปรุงเล็กน้อย (Keep the Lights On)" },
  { value: "RND",         label: "R&D / Proof of Concept",      desc: "งานทดลองเทคโนโลยีหรือเครื่องมือใหม่ๆ (Fail Fast)" },
  { value: "COMPLIANCE",  label: "Compliance & Security",       desc: "งานตามมาตรฐานองค์กร กฎหมาย PDPA และความปลอดภัย" },
]

const BUCKET_LABEL: Record<string, string> = Object.fromEntries(
  STRATEGIC_BUCKET_OPTIONS.map((o) => [o.value, o.label])
)

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  strategicBucket: "",
  client: "",
  tags: "",
  stakeholders: "",
  prdUrl: "",
  designPrototypeUrl: "",
  prdContent: "",
  productOwnerName: "",
  productOwnerAvatar: "",
}

type FormState = typeof EMPTY_FORM

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </label>
      {children}
      {helper && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {helper}
        </p>
      )}
    </div>
  )
}

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
const inputStyle = {
  borderColor: "var(--color-border)",
  background: "white",
  color: "var(--color-text-primary)",
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function ProjectsPanel() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [bucketInfoOpen, setBucketInfoOpen] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/projects")
      const data = await res.json()
      setProjects(data)
    } catch {
      showFeedback("error", "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setAvatarError(null)
    setDrawerOpen(true)
  }

  function openEdit(p: ProjectRow) {
    setEditId(p.id)
    setForm({
      name: p.name,
      description: p.description ?? "",
      category: p.category ?? "",
      strategicBucket: p.strategicBucket ?? "",
      client: p.client ?? "",
      tags: arrToInput((p as any).tags),
      stakeholders: arrToInput((p as any).stakeholders),
      prdUrl: p.prdUrl ?? "",
      designPrototypeUrl: p.designPrototypeUrl ?? "",
      prdContent: p.prdContent ?? "",
      productOwnerName: (p as any).productOwnerName ?? "",
      productOwnerAvatar: (p as any).productOwnerAvatar ?? "",
    })
    setAvatarError(null)
    setDrawerOpen(true)
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function buildPayload() {
    return {
      name: form.name,
      description: form.description,
      category: form.category,
      strategicBucket: form.strategicBucket || null,
      client: form.client || null,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      stakeholders: form.stakeholders.split(",").map((s) => s.trim()).filter(Boolean),
      prdUrl: form.prdUrl || null,
      designPrototypeUrl: form.designPrototypeUrl || null,
      prdContent: form.prdContent,
      productOwnerName: form.productOwnerName || null,
      productOwnerAvatar: form.productOwnerAvatar || null,
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setAvatarError(null)
    try {
      const dataUrl = await cropSquareImage(file)
      if (dataUrl.length > AVATAR_MAX_CHARS) {
        setAvatarError("รูปใหญ่เกินไป กรุณาเลือกรูปอื่น")
        return
      }
      setField("productOwnerAvatar", dataUrl)
    } catch {
      setAvatarError("อ่านไฟล์รูปไม่สำเร็จ")
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        const res = await fetch(`/api/projects/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        })
        if (!res.ok) throw new Error()
        showFeedback("success", "Project updated successfully")
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        })
        if (!res.ok) throw new Error()
        showFeedback("success", "Project created successfully")
      }
      setDrawerOpen(false)
      await load()
    } catch {
      showFeedback("error", "Save failed — check all required fields")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      showFeedback("success", "Project deleted")
      setConfirmDelete(null)
      await load()
    } catch {
      showFeedback("error", "Delete failed")
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Projects
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {projects.length} record{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white"
          style={{ background: "var(--color-accent)" }}
        >
          + New Project
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            background: feedback.type === "success" ? "var(--color-rag-green-light)" : "var(--color-rag-red-light)",
            color: feedback.type === "success" ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)",
          }}
        >
          {feedback.type === "success" ? "✓ " : "✗ "}
          {feedback.msg}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", background: "white" }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading…
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No projects yet. Create one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Bucket</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {p.strategicBucket ? (BUCKET_LABEL[p.strategicBucket] ?? p.strategicBucket) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:bg-accent-light"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-rag-red)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Drawer ─────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.3)" }}
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
            style={{ width: 560, background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
          >
            {/* Drawer header */}
            <div
              className="px-6 py-4 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <h2 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                {editId ? "Edit Project" : "New Project"}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-lg leading-none"
                style={{ color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              {/* ── Section: Core ── */}
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Core Info
              </p>

              <Field label="Name *">
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                  placeholder="e.g. Project Alpha"
                />
              </Field>

              <Field label="Description">
                <textarea
                  className={inputCls}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Short project description"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 relative">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Strategic Bucket *
                    </label>
                    <button
                      type="button"
                      onClick={() => setBucketInfoOpen((o) => !o)}
                      className="w-4 h-4 rounded-full text-xs leading-none flex items-center justify-center border"
                      style={{
                        borderColor: bucketInfoOpen ? "var(--color-accent)" : "var(--color-border)",
                        color: bucketInfoOpen ? "white" : "var(--color-accent)",
                        background: bucketInfoOpen ? "var(--color-accent)" : "transparent",
                      }}
                      title="ดูคำอธิบายทั้ง 8 Buckets"
                    >
                      i
                    </button>
                  </div>
                  <select
                    className={inputCls}
                    style={inputStyle}
                    value={form.strategicBucket}
                    onChange={(e) => setField("strategicBucket", e.target.value)}
                    required
                  >
                    <option value="">— Select bucket —</option>
                    {STRATEGIC_BUCKET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {STRATEGIC_BUCKET_OPTIONS.find((o) => o.value === form.strategicBucket)?.desc
                      ?? "จัดกลุ่มโครงการตาม 8 มิติเชิงกลยุทธ์"}
                  </p>

                  {/* Popover: all 8 bucket descriptions */}
                  {bucketInfoOpen && (
                    <div
                      className="absolute z-10 top-full left-0 mt-1 rounded-xl border shadow-lg p-4 flex flex-col gap-2.5"
                      style={{ width: 420, background: "white", borderColor: "var(--color-border)" }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
                          8 Strategic Buckets
                        </p>
                        <button
                          type="button"
                          onClick={() => setBucketInfoOpen(false)}
                          className="text-sm leading-none"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          ✕
                        </button>
                      </div>
                      {STRATEGIC_BUCKET_OPTIONS.map((opt, i) => (
                        <div key={opt.value} className="flex gap-2 text-xs">
                          <span className="font-semibold shrink-0" style={{ color: "var(--color-accent)" }}>
                            {i + 1}.
                          </span>
                          <div>
                            <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                              {opt.label}:
                            </span>{" "}
                            <span style={{ color: "var(--color-text-muted)" }}>{opt.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Field label="Category">
                  <input
                    className={inputCls}
                    style={inputStyle}
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    placeholder="e.g. Payments"
                  />
                </Field>
              </div>

              {/* ── Section: Metadata ── */}
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                Metadata
              </p>

              <Field label="Client">
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.client}
                  onChange={(e) => setField("client", e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </Field>

              <Field label="Tags" helper="Separate multiple values with commas">
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.tags}
                  onChange={(e) => setField("tags", e.target.value)}
                  placeholder="e.g. Design, Backend, API"
                />
              </Field>

              <Field label="Stakeholders" helper="Separate multiple values with commas">
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.stakeholders}
                  onChange={(e) => setField("stakeholders", e.target.value)}
                  placeholder="e.g. CEO, VP Product"
                />
              </Field>

              {/* ── Section: Product Owner ── */}
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                Product Owner
              </p>
              <p className="text-xs -mt-3" style={{ color: "var(--color-text-muted)" }}>
                ฝั่งธุรกิจ ไม่ผูกกับรายชื่อใน Admin People (ทีม dev เท่านั้น) — กรอกชื่อและรูปตรงนี้ได้เลย
              </p>

              <Field label="Product Owner Name">
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.productOwnerName}
                  onChange={(e) => setField("productOwnerName", e.target.value)}
                  placeholder="e.g. Somchai Sae-Lee"
                />
              </Field>

              <Field label="Product Owner Photo">
                <input type="file" accept="image/*" onChange={handleAvatarFile} className="text-sm" />
                {avatarError && (
                  <p className="text-xs mt-1" style={{ color: "var(--color-rag-red)" }}>{avatarError}</p>
                )}
              </Field>

              {form.productOwnerName && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-surface)" }}>
                  <Avatar name={form.productOwnerName} avatarUrl={form.productOwnerAvatar} size="lg" />
                  <p className="text-sm font-semibold flex-1" style={{ color: "var(--color-text-primary)" }}>{form.productOwnerName}</p>
                  {form.productOwnerAvatar && (
                    <button
                      type="button"
                      onClick={() => { setField("productOwnerAvatar", ""); setAvatarError(null) }}
                      className="text-xs px-2 py-1 rounded-lg border font-medium shrink-0"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-rag-red)" }}
                    >
                      ลบรูป
                    </button>
                  )}
                </div>
              )}

              {/* ── Section: Links & PRD ── */}
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                Links & PRD
              </p>

              <Field label="PRD URL">
                <input
                  type="url"
                  className={inputCls}
                  style={inputStyle}
                  value={form.prdUrl}
                  onChange={(e) => setField("prdUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Design Prototype URL">
                <input
                  type="url"
                  className={inputCls}
                  style={inputStyle}
                  value={form.designPrototypeUrl}
                  onChange={(e) => setField("designPrototypeUrl", e.target.value)}
                  placeholder="https://figma.com/..."
                />
              </Field>

              <Field label="PRD Content">
                <textarea
                  className={inputCls}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                  value={form.prdContent}
                  onChange={(e) => setField("prdContent", e.target.value)}
                  placeholder="Paste or write the full PRD content here…"
                />
              </Field>

              {/* Save button */}
              <div className="pt-2 pb-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
                  style={{ background: "var(--color-accent)", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : editId ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ─── Delete confirm dialog ────────────────────────────────────────── */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div
            className="fixed z-50 rounded-xl p-6 shadow-xl"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 360,
              background: "white",
            }}
          >
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--color-text-primary)" }}>
              Delete Project?
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
              This will permanently delete the project and all its related records (members, milestones, ideas, blockers, risks, next steps). This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg text-sm border font-medium"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--color-rag-red)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
