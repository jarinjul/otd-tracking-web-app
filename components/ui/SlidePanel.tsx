"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: string
}

export function SlidePanel({ open, onClose, children, width = "w-[720px]" }: SlidePanelProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full ${width} bg-card shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-text-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
