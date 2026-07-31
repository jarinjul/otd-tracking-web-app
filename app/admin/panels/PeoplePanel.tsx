"use client"

import { useEffect, useState, useCallback } from "react"
import type { ProjectRole } from "@/lib/types"

const ALL_ROLES: ProjectRole[] = [
  "ProjectManager",
  "TechLead",
  "Developer",
  "QAEngineer",
  "UIUXDesigner",
  "BusinessAnalyst",
  "Stakeholder",
  "ProductOwner",
  "DevOps",
  "Consultant",
]

const ROLE_LABELS: Record<ProjectRole, string> = {
  ProjectManager: "Project Manager",
  TechLead: "Tech Lead",
  Developer: "Developer",
  QAEngineer: "QA Engineer",
  UIUXDesigner: "UI/UX Designer",
  BusinessAnalyst: "Business Analyst",
  Stakeholder: "Stakeholder",
  ProductOwner: "Product Owner",
  DevOps: "DevOps",
  Consultant: "Consultant",
}

type PersonRow = {
  id: string
  name: string
  email: string | null
  department: string | null
  avatarUrl: string | null
  roles: ProjectRole[]
  _count: { memberships: number }
}

const EMPTY_FORM = {
  name: "",
  email: "",
  department: "",
  avatarUrl: "",
  roles: [] as ProjectRole[],
}

type FormState = typeof EMPTY_FORM

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </label>
      {children}
      {helper && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{helper}</p>}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
const inputStyle = { borderColor: "var(--color-border)", background: "white", color: "var(--color-text-primary)" }

const AVATAR_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
}

export function PeoplePanel() {
  const [people, setPeople] = useState<PersonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/people")
      setPeople(await res.json())
    } catch {
      showFeedback("error", "Failed to load people")
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
    setDrawerOpen(true)
  }

  function openEdit(p: PersonRow) {
    setEditId(p.id)
    setForm({
      name: p.name,
      email: p.email ?? "",
      department: p.department ?? "",
      avatarUrl: p.avatarUrl ?? "",
      roles: p.roles ?? [],
    })
    setDrawerOpen(true)
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function toggleRole(role: ProjectRole) {
    setForm((f) => ({
      ...f,
      roles: (f.roles ?? []).includes(role)
        ? (f.roles ?? []).filter((r) => r !== role)
        : [...(f.roles ?? []), role],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, email: form.email || null, department: form.department || null, avatarUrl: form.avatarUrl || null }
      if (editId) {
        const res = await fetch(`/api/admin/people/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        showFeedback("success", "Person updated successfully")
      } else {
        const res = await fetch("/api/admin/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        showFeedback("success", "Person created successfully")
      }
      setDrawerOpen(false)
      await load()
    } catch {
      showFeedback("error", "Save failed — check required fields")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/people/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      showFeedback("success", "Person deleted")
      setConfirmDelete(null)
      await load()
    } catch {
      showFeedback("error", "Delete failed — remove project memberships first")
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>People</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {people.length} record{people.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white"
          style={{ background: "var(--color-accent)" }}
        >
          + New Person
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            background: feedback.type === "success" ? "var(--color-rag-green-light)" : "var(--color-rag-red-light)",
            color: feedback.type === "success" ? "var(--color-rag-green-text)" : "var(--color-rag-red-text)",
          }}
        >
          {feedback.type === "success" ? "✓ " : "✗ "}{feedback.msg}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", background: "white" }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Loading…</div>
        ) : people.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>No people yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                {["", "Name", "Email", "Department", "Roles", "Projects", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((p, i) => (
                <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                  <td className="px-4 py-3 w-10">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: avatarColor(p.name) }}
                      >
                        {initials(p.name)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text-primary)" }}>{p.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>{p.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>{p.department ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.roles ?? []).length === 0 ? (
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>—</span>
                      ) : (
                        (p.roles ?? []).map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: "var(--color-accent-light)", color: "var(--color-accent-dark)" }}
                          >
                            {ROLE_LABELS[r]}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {p._count.memberships} project{p._count.memberships !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium"
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

      {/* ─── Drawer ───────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setDrawerOpen(false)} />
          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
            style={{ width: 480, background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                {editId ? "Edit Person" : "New Person"}
              </h2>
              <button onClick={() => setDrawerOpen(false)} className="text-lg leading-none" style={{ color: "var(--color-text-muted)" }}>✕</button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              <Field label="Name *">
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                  placeholder="e.g. Alice Wonderson"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  className={inputCls}
                  style={inputStyle}
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="e.g. alice@zenith.co"
                />
              </Field>

              <Field label="Department">
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.department}
                  onChange={(e) => setField("department", e.target.value)}
                  placeholder="e.g. Engineering, Product, Design"
                />
              </Field>

              <Field label="Avatar URL">
                <input
                  type="url"
                  className={inputCls}
                  style={inputStyle}
                  value={form.avatarUrl}
                  onChange={(e) => setField("avatarUrl", e.target.value)}
                  placeholder="https://…"
                />
              </Field>

              {/* ── Roles multi-select ── */}
              <Field label="Roles" helper="Select all roles this person holds in the organisation">
                <div
                  className="rounded-lg border p-3 grid grid-cols-2 gap-2"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {ALL_ROLES.map((role) => {
                    const checked = (form.roles ?? []).includes(role)
                    return (
                      <label
                        key={role}
                        className="flex items-center gap-2 cursor-pointer select-none rounded-lg px-2 py-1.5 transition-colors"
                        style={{
                          background: checked ? "var(--color-accent-light)" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRole(role)}
                          className="w-3.5 h-3.5 accent-accent shrink-0"
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: checked ? "var(--color-accent-dark)" : "var(--color-text-primary)" }}
                        >
                          {ROLE_LABELS[role]}
                        </span>
                      </label>
                    )
                  })}
                </div>
                {(form.roles ?? []).length > 0 && (
                  <p className="text-xs mt-1" style={{ color: "var(--color-accent)" }}>
                    {(form.roles ?? []).length} role{(form.roles ?? []).length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </Field>

              {/* Avatar preview */}
              {form.name && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-surface)" }}>
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: avatarColor(form.name) }}
                    >
                      {initials(form.name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{form.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {form.department || "No department"}
                      {(form.roles ?? []).length > 0 && ` · ${(form.roles ?? []).map(r => ROLE_LABELS[r]).join(", ")}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 pb-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
                  style={{ background: "var(--color-accent)", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : editId ? "Save Changes" : "Create Person"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ─── Delete confirm ───────────────────────────────────────────────────── */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div
            className="fixed z-50 rounded-xl p-6 shadow-xl"
            style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, background: "white" }}
          >
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--color-text-primary)" }}>Delete Person?</h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
              This will remove the person from the system. If they are still assigned to any projects, the delete will fail — remove their project memberships first.
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
