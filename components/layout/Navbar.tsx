"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, GitBranch, FileText, Users, Download, Building2, ListChecks, Gauge } from "lucide-react"

// Hub-and-spoke mark: a central node radiating to six satellites — the Nexus Hub brand icon.
function NexusIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="12" x2="12" y2="4" />
        <line x1="12" y1="12" x2="18.9" y2="8" />
        <line x1="12" y1="12" x2="18.9" y2="16" />
        <line x1="12" y1="12" x2="12" y2="20" />
        <line x1="12" y1="12" x2="5.1" y2="16" />
        <line x1="12" y1="12" x2="5.1" y2="8" />
      </g>
      <circle cx="12" cy="4" r="1.8" fill="currentColor" />
      <circle cx="18.9" cy="8" r="1.8" fill="currentColor" />
      <circle cx="18.9" cy="16" r="1.8" fill="currentColor" />
      <circle cx="12" cy="20" r="1.8" fill="currentColor" />
      <circle cx="5.1" cy="16" r="1.8" fill="currentColor" />
      <circle cx="5.1" cy="8" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard",    icon: BarChart2  },
  { href: "/weekly-plan",  label: "Weekly Plan",  icon: ListChecks },
  { href: "/gantt",        label: "Gantt",        icon: GitBranch  },
  { href: "/workload",     label: "Workload",     icon: Gauge      },
  { href: "/workspace",    label: "PRD Center",   icon: FileText   },
  { href: "/people",       label: "People",       icon: Users      },
  { href: "/vendors",      label: "Vendors",      icon: Building2  },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="bg-primary text-white shrink-0">
      <div className="flex items-center h-14 px-6 gap-8">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
          <NexusIcon size={20} className="text-accent" />
          <span>NEXUS HUB</span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Export */}
        <Link
          href="/report"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-accent hover:bg-accent-dark transition-colors shrink-0"
        >
          <Download size={15} />
          <span>Export</span>
        </Link>

        {/* Admin — subtle link */}
        <Link
          href="/admin"
          className="text-xs px-2 py-1 rounded transition-colors shrink-0"
          style={{ color: "rgba(255,255,255,0.3)" }}
          title="Admin Data Entry"
        >
          Admin
        </Link>
      </div>
    </header>
  )
}
