"use client"

import { useState } from "react"
import { Check, RotateCcw, Circle, Pencil, Trash2, Plus } from "lucide-react"

export type PlanItemStatus = "pending" | "done" | "carried_over"

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  sortOrder: number
}

export interface PlanItem {
  id: string
  source: "auto" | "manual"
  itemType: string | null
  title: string
  subtitle: string | null
  note: string | null
  projectName: string | null
  owner: string | null
  status: PlanItemStatus
  sortOrder: number
  checklist: ChecklistItem[]
  carriedFromId: string | null
}

const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)",   label: "🔴 Critical" },
  delayed:  { bg: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)", label: "⏱ Delayed" },
  decision: { bg: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)", label: "⚠ Decision" },
  blocker:  { bg: "var(--color-rag-red-light)",   color: "var(--color-rag-red-text)",   label: "🚧 Blocker" },
  task:     { bg: "var(--color-accent-light)",    color: "var(--color-accent)",         label: "✅ P0 Task" },
  planned:  { bg: "var(--color-rag-green-light)", color: "var(--color-rag-green-text)", label: "🗓 Planned" },
  manual:   { bg: "var(--color-surface)",         color: "var(--color-text-muted)",     label: "📝 Manual" },
}

const inputCls = "w-full px-2.5 py-1.5 text-sm rounded-lg border outline-none focus:ring-2"
const inputStyle = { borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-text-primary)" }

interface EditablePlanItemsProps {
  items: PlanItem[]
  onUpdate: (id: string, patch: Partial<Pick<PlanItem, "title" | "subtitle" | "note" | "status">>) => void
  onDelete: (id: string) => void
  onAdd: (data: { title: string; subtitle: string; note: string; projectName: string; owner: string }) => void
  onSync: () => void
  syncing: boolean
  onChecklistAdd: (planItemId: string, text: string) => void
  onChecklistToggle: (planItemId: string, checklistId: string, done: boolean) => void
  onChecklistEdit: (planItemId: string, checklistId: string, text: string) => void
  onChecklistDelete: (planItemId: string, checklistId: string) => void
}

function StatusButtons({ status, onChange }: { status: PlanItemStatus; onChange: (s: PlanItemStatus) => void }) {
  const btnCls = (active: boolean) =>
    `flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${active ? "" : "hover:bg-gray-50"}`
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => onChange("pending")}
        className={btnCls(status === "pending")}
        style={{
          borderColor: "var(--color-border)",
          background: status === "pending" ? "var(--color-surface)" : "var(--color-card)",
          color: "var(--color-text-muted)",
        }}
        title="Pending"
      >
        <Circle size={12} /> Pending
      </button>
      <button
        onClick={() => onChange("done")}
        className={btnCls(status === "done")}
        style={{
          borderColor: status === "done" ? "var(--color-rag-green)" : "var(--color-border)",
          background: status === "done" ? "var(--color-rag-green-light)" : "var(--color-card)",
          color: status === "done" ? "var(--color-rag-green-text)" : "var(--color-text-muted)",
        }}
        title="Mark done"
      >
        <Check size={12} /> Done
      </button>
      <button
        onClick={() => onChange("carried_over")}
        className={btnCls(status === "carried_over")}
        style={{
          borderColor: status === "carried_over" ? "var(--color-rag-amber)" : "var(--color-border)",
          background: status === "carried_over" ? "var(--color-rag-amber-light)" : "var(--color-card)",
          color: status === "carried_over" ? "var(--color-rag-amber-text)" : "var(--color-text-muted)",
        }}
        title="ไม่เสร็จ — carry ไป week หน้า"
      >
        <RotateCcw size={12} /> Carry Next Week
      </button>
    </div>
  )
}

function ChecklistRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ChecklistItem
  onToggle: (done: boolean) => void
  onEdit: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)

  function save() {
    const trimmed = text.trim()
    setEditing(false)
    if (trimmed && trimmed !== item.text) onEdit(trimmed)
    else setText(item.text)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") { setEditing(false); setText(item.text) }
          }}
          onBlur={save}
          className="flex-1 text-xs px-1.5 py-0.5 rounded border outline-none focus:ring-2"
          style={inputStyle}
        />
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2">
      <input
        type="checkbox"
        checked={item.done}
        onChange={(e) => onToggle(e.target.checked)}
        className="shrink-0"
        style={{ accentColor: "var(--color-accent)" }}
      />
      <span
        className="flex-1 text-xs cursor-text"
        onDoubleClick={() => setEditing(true)}
        style={{
          color: item.done ? "var(--color-text-muted)" : "var(--color-text-primary)",
          textDecoration: item.done ? "line-through" : "none",
        }}
      >
        {item.text}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
        style={{ color: "var(--color-text-muted)" }}
        title="แก้ไข to-do"
      >
        <Pencil size={11} />
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
        style={{ color: "var(--color-rag-red)" }}
        title="ลบ to-do"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function ChecklistSection({
  planItemId,
  checklist,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: {
  planItemId: string
  checklist: ChecklistItem[]
  onToggle: (checklistId: string, done: boolean) => void
  onEdit: (checklistId: string, text: string) => void
  onDelete: (checklistId: string) => void
  onAdd: (text: string) => void
}) {
  const [newText, setNewText] = useState("")
  const done = checklist.filter((c) => c.done).length
  const total = checklist.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function submitAdd() {
    const trimmed = newText.trim()
    if (trimmed) {
      onAdd(trimmed)
      setNewText("")
    }
  }

  return (
    <div className="mt-2.5">
      {total > 0 && (
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1 rounded-full h-1" style={{ background: "var(--color-surface)" }}>
            <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--color-accent)" }} />
          </div>
          <span className="text-[10px] font-medium shrink-0" style={{ color: "var(--color-text-muted)" }}>{done}/{total}</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {checklist.map((c) => (
          <ChecklistRow
            key={c.id}
            item={c}
            onToggle={(done) => onToggle(c.id, done)}
            onEdit={(text) => onEdit(c.id, text)}
            onDelete={() => onDelete(c.id)}
          />
        ))}

        <div className="flex items-center gap-2 mt-0.5">
          <Plus size={12} style={{ color: "var(--color-text-muted)" }} className="shrink-0" />
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitAdd() }}
            onBlur={submitAdd}
            placeholder="เพิ่ม to-do…"
            className="flex-1 text-xs bg-transparent outline-none"
            style={{ color: "var(--color-text-primary)" }}
          />
        </div>
      </div>
    </div>
  )
}

function ItemRow({
  item,
  onUpdate,
  onDelete,
  onChecklistAdd,
  onChecklistToggle,
  onChecklistEdit,
  onChecklistDelete,
}: {
  item: PlanItem
  onUpdate: EditablePlanItemsProps["onUpdate"]
  onDelete: (id: string) => void
  onChecklistAdd: EditablePlanItemsProps["onChecklistAdd"]
  onChecklistToggle: EditablePlanItemsProps["onChecklistToggle"]
  onChecklistEdit: EditablePlanItemsProps["onChecklistEdit"]
  onChecklistDelete: EditablePlanItemsProps["onChecklistDelete"]
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [subtitle, setSubtitle] = useState(item.subtitle ?? "")
  const [note, setNote] = useState(item.note ?? "")

  const st = TYPE_STYLE[item.itemType ?? "manual"] ?? TYPE_STYLE.manual

  function save() {
    onUpdate(item.id, { title, subtitle, note })
    setEditing(false)
  }

  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        background: "var(--color-surface)",
        opacity: item.status === "done" ? 0.6 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ background: st.bg, color: st.color }}>
              {st.label}
            </span>
            {item.status === "carried_over" && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--color-rag-amber-light)", color: "var(--color-rag-amber-text)" }}>
                ↻ Carrying to next week
              </span>
            )}
          </div>

          {editing ? (
            <div className="flex flex-col gap-2 mt-1">
              <input className={inputCls} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <input className={inputCls} style={inputStyle} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle (optional)" />
              <textarea className={inputCls} style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เพิ่มโน๊ต…" />
              <div className="flex gap-2">
                <button onClick={save} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: "var(--color-accent)" }}>Save</button>
                <button onClick={() => { setEditing(false); setTitle(item.title); setSubtitle(item.subtitle ?? ""); setNote(item.note ?? "") }} className="text-xs px-3 py-1.5 rounded-lg border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className={`text-sm font-medium ${item.status === "done" ? "line-through" : ""}`} style={{ color: "var(--color-text-primary)" }}>{item.title}</p>
              {item.subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{item.subtitle}</p>}
              {item.note && (
                <p className="text-xs mt-1.5 px-2 py-1.5 rounded" style={{ background: "var(--color-card)", color: "var(--color-text-primary)", borderLeft: "3px solid var(--color-accent)", whiteSpace: "pre-wrap" }}>
                  📝 {item.note}
                </p>
              )}
            </>
          )}

          <ChecklistSection
            planItemId={item.id}
            checklist={item.checklist}
            onToggle={(checklistId, done) => onChecklistToggle(item.id, checklistId, done)}
            onEdit={(checklistId, text) => onChecklistEdit(item.id, checklistId, text)}
            onDelete={(checklistId) => onChecklistDelete(item.id, checklistId)}
            onAdd={(text) => onChecklistAdd(item.id, text)}
          />
        </div>

        {!editing && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-gray-100" style={{ color: "var(--color-text-muted)" }} title="Edit">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(item.id)} className="p-1.5 rounded hover:bg-gray-100" style={{ color: "var(--color-rag-red)" }} title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {!editing && (
        <div className="mt-2">
          <StatusButtons status={item.status} onChange={(s) => onUpdate(item.id, { status: s })} />
        </div>
      )}
    </div>
  )
}

function AddItemForm({ onAdd, onCancel }: { onAdd: EditablePlanItemsProps["onAdd"]; onCancel: () => void }) {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [note, setNote] = useState("")
  const [projectName, setProjectName] = useState("")
  const [owner, setOwner] = useState("")

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: "var(--color-accent-light)", border: "1px dashed var(--color-accent)" }}>
      <input className={inputCls} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="สิ่งที่ต้องทำ…" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} style={inputStyle} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project (optional)" />
        <input className={inputCls} style={inputStyle} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner (optional)" />
      </div>
      <input className={inputCls} style={inputStyle} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle (optional)" />
      <textarea className={inputCls} style={{ ...inputStyle, resize: "vertical", minHeight: 48 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน๊ตเพิ่มเติม (optional)" />
      <div className="flex gap-2">
        <button
          onClick={() => { if (title.trim()) { onAdd({ title, subtitle, note, projectName, owner }); setTitle(""); setSubtitle(""); setNote(""); setProjectName(""); setOwner("") } }}
          disabled={!title.trim()}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          + Add
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>Cancel</button>
      </div>
    </div>
  )
}

export function EditablePlanItems({ items, onUpdate, onDelete, onAdd, onSync, syncing, onChecklistAdd, onChecklistToggle, onChecklistEdit, onChecklistDelete }: EditablePlanItemsProps) {
  const [addingOpen, setAddingOpen] = useState(false)

  return (
    <div className="rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>This Week&apos;s Plan</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={syncing}
            className="text-xs px-2.5 py-1 rounded-lg border font-medium disabled:opacity-50"
            style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
          >
            {syncing ? "Syncing…" : "🔄 Sync Auto Items"}
          </button>
          <button
            onClick={() => setAddingOpen(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold text-white"
            style={{ background: "var(--color-accent)" }}
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2.5">
        {addingOpen && <AddItemForm onAdd={(d) => { onAdd(d); setAddingOpen(false) }} onCancel={() => setAddingOpen(false)} />}

        {items.length === 0 && !addingOpen ? (
          <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            🎉 ไม่มีเรื่องเร่งด่วน — เพิ่มรายการเองได้ด้วยปุ่ม + Add
          </div>
        ) : (
          items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onChecklistAdd={onChecklistAdd}
              onChecklistToggle={onChecklistToggle}
              onChecklistEdit={onChecklistEdit}
              onChecklistDelete={onChecklistDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
