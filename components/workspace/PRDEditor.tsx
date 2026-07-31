"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useState, useCallback } from "react"
import { Bold, Italic, List, Heading2, Save, CheckCircle } from "lucide-react"

const PRD_TEMPLATE = `## 1. Objective
[อธิบายเป้าหมายของโปรเจกต์นี้]

## 2. Target Scope & Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## 3. User Stories
- As a [user], I want to [action] so that [benefit]

## 4. Out of Scope
- Item not included in this phase

## 5. Non-Functional Requirements
- Performance: [ระบุ]
- Security: [ระบุ]
- Availability: [ระบุ]
`

interface PRDEditorProps {
  projectId: string
  initialContent: string
  onSignOff: () => void
}

export function PRDEditor({ projectId, initialContent, onSignOff }: PRDEditorProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing your PRD…" }),
    ],
    content: initialContent || PRD_TEMPLATE,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4 text-text-primary",
      },
    },
  })

  const handleSave = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prdContent: editor.getHTML() }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, projectId])

  async function handleRequestApproval() {
    setRequesting(true)
    await handleSave()
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "prd_signoff" }),
    })
    setRequesting(false)
    onSignOff()
  }

  if (!editor) return null

  return (
    <div className="flex flex-col gap-0 border border-border rounded-card overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-gray-50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded text-text-muted hover:bg-gray-200 transition-colors ${editor.isActive("bold") ? "bg-gray-200 text-text-primary" : ""}`}
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded text-text-muted hover:bg-gray-200 transition-colors ${editor.isActive("italic") ? "bg-gray-200 text-text-primary" : ""}`}
        >
          <Italic size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded text-text-muted hover:bg-gray-200 transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-gray-200 text-text-primary" : ""}`}
        >
          <Heading2 size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded text-text-muted hover:bg-gray-200 transition-colors ${editor.isActive("bulletList") ? "bg-gray-200 text-text-primary" : ""}`}
        >
          <List size={14} />
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-card border border-border rounded hover:bg-gray-100 text-text-muted transition-colors"
        >
          {saved ? <CheckCircle size={13} className="text-rag-green" /> : <Save size={13} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Draft"}
        </button>
        <button
          onClick={handleRequestApproval}
          disabled={requesting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          {requesting ? "Submitting…" : "Request Approval →"}
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
