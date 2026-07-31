"use client"

import { useEffect, useState, useCallback } from "react"
import type { ProjectRole } from "@/lib/types"

const ALL_ROLES: ProjectRole[] = [
  "ProjectManager", "TechLead", "Developer", "QAEngineer", "UIUXDesigner",
  "BusinessAnalyst", "Stakeholder", "ProductOwner", "DevOps", "Consultant",
]

const ROLE_LABELS: Record<ProjectRole, string> = {
  ProjectManager: "Project Manager", TechLead: "Tech Lead", Developer: "Developer",
  QAEngineer: "QA Engineer", UIUXDesigner: "UI/UX Designer", BusinessAnalyst: "Business Analyst",
  Stakeholder: "Stakeholder", ProductOwner: "Product Owner", DevOps: "DevOps", Consultant: "Consultant",
}

type MemberRow = {
  id: string
  projectId: string
  personId: string
  role: ProjectRole
  responsibilities: string[]
  startDate: string
  endDate: string | null
  allocationPercent: number | null
  project: { id: string; name: string }
  person: { id: string; name: string }
}

type ProjectOption = { id: string; name: string; startDate: string; deadline: string }
type PersonOption = { id: string; name: string }

// One person/role/allocation/responsibilities set within the multi-add form
type AddEntry = { personId: string; role: ProjectRole; allocationPercent: string; responsibilities: string }
const EMPTY_ENTRY: AddEntry = { personId: "", role: "Developer", allocationPercent: "", responsibilities: "" }

// Single-assignment edit form (no dates — those come from the project's Timeline)
const EMPTY_EDIT_FORM = { personId: "", role: "Developer" as ProjectRole, allocationPercent: "", responsibilities: "" }
type EditFormState = typeof EMPTY_EDIT_FORM

function toDisplayDate(val: string | null | undefined) {
  if (!val) return "—"
  return new Date(val).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{label}</label>
      {children}
      {helper && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{helper}</p>}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
const inputStyle = { borderColor: "var(--color-border)", background: "white", color: "var(--color-text-primary)" }
const miniLabelCls = "text-xs font-medium mb-1 block"

export function ProjectMembersPanel() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  // Add-members drawer (multi-entry)
  const [addOpen, setAddOpen] = useState(false)
  const [addProjectId, setAddProjectId] = useState("")
  const [addEntries, setAddEntries] = useState<AddEntry[]>([{ ...EMPTY_ENTRY }])
  const [addLocked, setAddLocked] = useState(false) // true when launched from a project's detail panel
  const [saving, setSaving] = useState(false)

  // Project detail panel (view-only list, de-duplicated table)
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null)

  // Single-assignment edit (opened from within detail panel)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [membersRes, projectsRes, peopleRes] = await Promise.all([
        fetch("/api/admin/members"),
        fetch("/api/projects"),
        fetch("/api/admin/people"),
      ])
      setMembers(await membersRes.json())
      const allProjects = await projectsRes.json()
      setProjects(allProjects.map((p: any) => ({ id: p.id, name: p.name, startDate: p.startDate, deadline: p.deadline })))
      const allPeople = await peopleRes.json()
      setPeople(allPeople.map((p: any) => ({ id: p.id, name: p.name })))
    } catch {
      showFeedback("error", "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  // ── Add drawer (multiple person/role/allocation/responsibilities sets) ──
  function openAdd(lockedProjectId?: string) {
    setAddProjectId(lockedProjectId ?? projects[0]?.id ?? "")
    setAddLocked(!!lockedProjectId)
    setAddEntries([{ ...EMPTY_ENTRY }])
    setAddOpen(true)
  }

  function updateAddEntry(i: number, patch: Partial<AddEntry>) {
    setAddEntries((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  }
  function addAddEntry() {
    setAddEntries((es) => [...es, { ...EMPTY_ENTRY }])
  }
  function removeAddEntry(i: number) {
    setAddEntries((es) => es.filter((_, j) => j !== i))
  }

  const selectedAddProject = projects.find((p) => p.id === addProjectId)

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAddProject) return
    setSaving(true)
    try {
      const entries = addEntries
        .filter((en) => en.personId && en.role)
        .map((en) => ({
          personId: en.personId,
          role: en.role,
          allocationPercent: en.allocationPercent !== "" ? Number(en.allocationPercent) : null,
          responsibilities: en.responsibilities.split(",").map((s) => s.trim()).filter(Boolean),
        }))
      if (entries.length === 0) throw new Error()

      const res = await fetch("/api/admin/members/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedAddProject.id,
          startDate: selectedAddProject.startDate,
          endDate: null,
          entries,
        }),
      })
      if (!res.ok) throw new Error()
      showFeedback("success", `Added ${entries.length} member${entries.length !== 1 ? "s" : ""} to ${selectedAddProject.name}`)
      setAddOpen(false)
      await load()
    } catch {
      showFeedback("error", "Save failed — check that each entry has a person and role")
    } finally {
      setSaving(false)
    }
  }

  // ── Single-assignment edit (inside detail panel) ──
  function openEdit(m: MemberRow) {
    setEditId(m.id)
    setEditForm({
      personId: m.personId,
      role: m.role,
      allocationPercent: m.allocationPercent != null ? String(m.allocationPercent) : "",
      responsibilities: (m.responsibilities ?? []).join(", "),
    })
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    const original = members.find((m) => m.id === editId)
    if (!original) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/members/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: original.projectId,
          personId: editForm.personId,
          role: editForm.role,
          responsibilities: editForm.responsibilities.split(",").map((s) => s.trim()).filter(Boolean),
          startDate: original.startDate,
          endDate: original.endDate,
          allocationPercent: editForm.allocationPercent !== "" ? Number(editForm.allocationPercent) : null,
        }),
      })
      if (!res.ok) throw new Error()
      showFeedback("success", "Assignment updated")
      setEditId(null)
      await load()
    } catch {
      showFeedback("error", "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      showFeedback("success", "Member removed")
      setConfirmDelete(null)
      await load()
    } catch {
      showFeedback("error", "Delete failed")
    }
  }

  // ── Group assignments by project — one row per project ──
  const projectGroups = projects
    .map((p) => ({ project: p, members: members.filter((m) => m.projectId === p.id) }))
    .filter((g) => g.members.length > 0)
    .sort((a, b) => a.project.name.localeCompare(b.project.name))

  const detailGroup = detailProjectId ? projectGroups.find((g) => g.project.id === detailProjectId) : null

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Project Members</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {members.length} assignment{members.length !== 1 ? "s" : ""} across {projectGroups.length} project{projectGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white"
          style={{ background: "var(--color-accent)" }}
        >
          + Add Members
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

      {/* Table — one row per project */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", background: "white" }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Loading…</div>
        ) : projectGroups.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>No members yet. Add some above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                {["Project", "People", "Roles", "Assignments", "Timeline", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectGroups.map((g, i) => {
                const uniquePeople = Array.from(new Set(g.members.map((m) => m.person.name)))
                const uniqueRoles = Array.from(new Set(g.members.map((m) => m.role)))
                return (
                  <tr key={g.project.id} style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                    <td className="px-4 py-3 font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {g.project.name}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-primary)", maxWidth: 220 }}>
                      {uniquePeople.slice(0, 3).join(", ")}
                      {uniquePeople.length > 3 && <span style={{ color: "var(--color-text-muted)" }}> +{uniquePeople.length - 3} more</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {uniqueRoles.slice(0, 2).map((r) => (
                          <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--color-accent-light)", color: "var(--color-accent-dark)" }}>
                            {ROLE_LABELS[r]}
                          </span>
                        ))}
                        {uniqueRoles.length > 2 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
                            +{uniqueRoles.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {g.members.length}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {toDisplayDate(g.project.startDate)} → {toDisplayDate(g.project.deadline)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailProjectId(g.project.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
                      >
                        View Detail →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Add Members drawer (multi-entry) ──────────────────────────────── */}
      {addOpen && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setAddOpen(false)} />
          <div
            className="fixed top-0 right-0 h-full z-[61] flex flex-col overflow-hidden"
            style={{ width: 560, background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>Add Members to Project</h2>
              <button onClick={() => setAddOpen(false)} className="text-lg leading-none" style={{ color: "var(--color-text-muted)" }}>✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              {/* Thai note */}
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{ background: "var(--color-accent-light)", color: "var(--color-accent-dark)", borderLeft: "3px solid var(--color-accent)" }}
              >
                บุคคลหนึ่งคนสามารถมีหลาย Role ในโครงการเดียวกันได้
              </div>

              <Field label="Project *">
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={addProjectId}
                  onChange={(e) => setAddProjectId(e.target.value)}
                  required
                  disabled={addLocked}
                >
                  <option value="">— Select project —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>

              {selectedAddProject && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
                  Timeline (จาก Project): <strong style={{ color: "var(--color-text-primary)" }}>
                    {toDisplayDate(selectedAddProject.startDate)} → {toDisplayDate(selectedAddProject.deadline)}
                  </strong>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  Team Assignments
                </p>
                <button
                  type="button"
                  onClick={addAddEntry}
                  className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
                >
                  + เพิ่มคน
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {addEntries.map((entry, i) => (
                  <div key={i} className="rounded-xl border p-3 relative" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    {addEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAddEntry(i)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center border"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-rag-red)", background: "white" }}
                        title="ลบชุดนี้"
                      >
                        ✕
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Person</label>
                        <select className={inputCls} style={inputStyle} value={entry.personId} onChange={(e) => updateAddEntry(i, { personId: e.target.value })}>
                          <option value="">— Select person —</option>
                          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Role</label>
                        <select className={inputCls} style={inputStyle} value={entry.role} onChange={(e) => updateAddEntry(i, { role: e.target.value as ProjectRole })}>
                          {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Allocation (%)</label>
                      <input
                        type="number" min={0} max={100}
                        className={inputCls} style={inputStyle}
                        value={entry.allocationPercent}
                        onChange={(e) => updateAddEntry(i, { allocationPercent: e.target.value })}
                        placeholder="e.g. 50"
                      />
                    </div>
                    <div>
                      <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Responsibilities</label>
                      <input
                        className={inputCls} style={inputStyle}
                        value={entry.responsibilities}
                        onChange={(e) => updateAddEntry(i, { responsibilities: e.target.value })}
                        placeholder="e.g. Manage timeline, Stakeholder updates"
                      />
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Separate multiple values with commas</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 pb-2">
                <button
                  type="submit"
                  disabled={saving || !addProjectId}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
                  style={{ background: "var(--color-accent)", opacity: saving || !addProjectId ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : `Add ${addEntries.length} Member${addEntries.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ─── Project detail panel (view-only list + inline edit) ──────────── */}
      {detailGroup && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setDetailProjectId(null)} />
          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
            style={{ width: 560, background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h2 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>{detailGroup.project.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Timeline: {toDisplayDate(detailGroup.project.startDate)} → {toDisplayDate(detailGroup.project.deadline)}
                </p>
              </div>
              <button onClick={() => setDetailProjectId(null)} className="text-lg leading-none" style={{ color: "var(--color-text-muted)" }}>✕</button>
            </div>

            <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={() => openAdd(detailGroup.project.id)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                style={{ background: "var(--color-accent)" }}
              >
                + Add More Members
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
              {detailGroup.members.map((m) => (
                <div key={m.id} className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
                  {editId === m.id ? (
                    <form onSubmit={handleEditSave} className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Person</label>
                          <select className={inputCls} style={inputStyle} value={editForm.personId} onChange={(e) => setEditForm((f) => ({ ...f, personId: e.target.value }))} required>
                            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Role</label>
                          <select className={inputCls} style={inputStyle} value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as ProjectRole }))} required>
                            {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Allocation (%)</label>
                        <input type="number" min={0} max={100} className={inputCls} style={inputStyle} value={editForm.allocationPercent} onChange={(e) => setEditForm((f) => ({ ...f, allocationPercent: e.target.value }))} placeholder="e.g. 50" />
                      </div>
                      <div>
                        <label className={miniLabelCls} style={{ color: "var(--color-text-primary)" }}>Responsibilities</label>
                        <input className={inputCls} style={inputStyle} value={editForm.responsibilities} onChange={(e) => setEditForm((f) => ({ ...f, responsibilities: e.target.value }))} placeholder="Separate with commas" />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditId(null)} className="flex-1 py-2 rounded-lg text-sm border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--color-accent)", opacity: saving ? 0.6 : 1 }}>Save</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{m.person.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--color-accent-light)", color: "var(--color-accent-dark)" }}>
                            {ROLE_LABELS[m.role]}
                          </span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => openEdit(m)} className="text-xs px-2.5 py-1 rounded-lg border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>Edit</button>
                          <button onClick={() => setConfirmDelete(m.id)} className="text-xs px-2.5 py-1 rounded-lg border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-rag-red)" }}>Remove</button>
                        </div>
                      </div>
                      <p className="text-xs mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                        Allocation: <strong style={{ color: "var(--color-text-primary)" }}>{m.allocationPercent != null ? `${m.allocationPercent}%` : "—"}</strong>
                      </p>
                      {(m.responsibilities ?? []).length > 0 && (
                        <ul className="flex flex-col gap-0.5">
                          {m.responsibilities.map((r, i) => (
                            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                              <span style={{ color: "var(--color-accent)" }}>•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Delete confirm ───────────────────────────────────────────────────── */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div
            className="fixed z-[71] rounded-xl p-6 shadow-xl"
            style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, background: "white" }}
          >
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--color-text-primary)" }}>Remove Member?</h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
              This removes this specific role assignment. Other roles the same person holds in this project are not affected.
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
                Remove
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
