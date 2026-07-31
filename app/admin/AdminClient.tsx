"use client"

import { useState } from "react"
import { ProjectsPanel } from "./panels/ProjectsPanel"
import { PeoplePanel } from "./panels/PeoplePanel"
import { ProjectMembersPanel } from "./panels/ProjectMembersPanel"
import { ReleasesPanel } from "./panels/ReleasesPanel"
import { ReleasePolicyPanel } from "./panels/ReleasePolicyPanel"
import { VendorOrdersPanel } from "./panels/VendorOrdersPanel"

const ENTITIES = [
  { key: "projects", label: "Projects", ready: true },
  { key: "people", label: "People", ready: true },
  { key: "members", label: "Project Members", ready: true },
  { key: "releases", label: "Releases", ready: true },
  { key: "releasePolicy", label: "Release Policy", ready: true },
  { key: "vendorOrders", label: "Vendor Orders", ready: true },
]

export function AdminClient() {
  const [active, setActive] = useState("projects")

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-sans)", background: "var(--color-surface)" }}>
      {/* Sidebar */}
      <aside
        className="w-56 shrink-0 border-r flex flex-col"
        style={{ background: "var(--color-primary)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">⚡</span>
            <span className="text-white font-bold text-sm tracking-wide">ZENITH ADMIN</span>
          </div>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Data Entry Panel</p>
        </div>

        <nav className="flex-1 py-3">
          {ENTITIES.map((e) => (
            <button
              key={e.key}
              onClick={() => e.ready && setActive(e.key)}
              className="w-full text-left px-5 py-2.5 text-sm transition-colors"
              style={{
                color: e.ready
                  ? active === e.key ? "white" : "rgba(255,255,255,0.65)"
                  : "rgba(255,255,255,0.25)",
                background: active === e.key ? "rgba(99,102,241,0.35)" : "transparent",
                cursor: e.ready ? "pointer" : "default",
                fontWeight: active === e.key ? 600 : 400,
              }}
            >
              {e.label}
              {!e.ready && (
                <span className="ml-2 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                  soon
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <a
            href="/"
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ← Back to App
          </a>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {active === "projects" && <ProjectsPanel />}
        {active === "people" && <PeoplePanel />}
        {active === "members" && <ProjectMembersPanel />}
        {active === "releases" && <ReleasesPanel />}
        {active === "releasePolicy" && <ReleasePolicyPanel />}
        {active === "vendorOrders" && <VendorOrdersPanel />}
      </main>
    </div>
  )
}
