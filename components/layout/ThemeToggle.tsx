"use client"

import { useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"
const STORAGE_KEY = "nexus-theme"

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  function choose(next: Theme) {
    setTheme(next)
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <div
      className="flex items-center rounded-full p-0.5 shrink-0"
      style={{ background: "rgba(255,255,255,0.1)" }}
      title="สลับ Day / Night mode"
    >
      <button
        type="button"
        onClick={() => choose("dark")}
        className="flex items-center justify-center w-6 h-6 rounded-full transition-colors"
        style={{
          background: theme === "dark" ? "white" : "transparent",
          color: theme === "dark" ? "#1E2A3A" : "rgba(255,255,255,0.55)",
        }}
        title="Night mode"
      >
        <Moon size={12} />
      </button>
      <button
        type="button"
        onClick={() => choose("light")}
        className="flex items-center justify-center w-6 h-6 rounded-full transition-colors"
        style={{
          background: theme === "light" ? "white" : "transparent",
          color: theme === "light" ? "#1E2A3A" : "rgba(255,255,255,0.55)",
        }}
        title="Day mode"
      >
        <Sun size={12} />
      </button>
    </div>
  )
}
