"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart2, GitBranch, FileText, Users, Download, Building2, ListChecks, Gauge, Network, Zap, CalendarRange, LogOut } from "lucide-react"
import { NexusIcon } from "@/components/ui/NexusIcon"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard",    icon: BarChart2  },
  { href: "/weekly-plan",  label: "Weekly Plan",  icon: ListChecks },
  { href: "/gantt",        label: "Gantt",        icon: GitBranch  },
  { href: "/workload",     label: "Workload",     icon: Gauge      },
  { href: "/resource-planning", label: "Resources", icon: CalendarRange },
  { href: "/interrupts",   label: "Interrupts",   icon: Zap        },
  { href: "/workspace",    label: "PRD Center",   icon: FileText   },
  { href: "/people",       label: "People",       icon: Users      },
  { href: "/vendors",      label: "Vendors",      icon: Building2  },
  { href: "/landscape",    label: "Landscape",    icon: Network    },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  if (pathname === "/login") return null

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="bg-primary text-white shrink-0">
      <div className="flex items-center h-14 px-3 gap-2">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
          <NexusIcon size={20} className="text-accent" />
          <span>NEXUS HUB</span>
        </Link>

        {/* Nav Links — overflow-x-auto is a safety net if the window is ever narrower than 1280px;
            the spacing below is tuned so all items fit without scrolling at 1280px. */}
        <nav className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1 px-1 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={13} />
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
          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-accent hover:bg-accent-dark transition-colors shrink-0 whitespace-nowrap"
        >
          <Download size={14} />
          <span>Export</span>
        </Link>

        <ThemeToggle />

        {/* Admin — subtle link */}
        <Link
          href="/admin"
          className="text-xs px-2 py-1 rounded transition-colors shrink-0"
          style={{ color: "rgba(255,255,255,0.3)" }}
          title="Admin Data Entry"
        >
          Admin
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors shrink-0 hover:text-white"
          style={{ color: "rgba(255,255,255,0.5)" }}
          title="Logout"
        >
          <LogOut size={13} />
          Logout
        </button>
      </div>
    </header>
  )
}
