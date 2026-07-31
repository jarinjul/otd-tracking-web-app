"use client"

import { useDashboardStore } from "@/lib/stores/dashboardStore"

const BUCKET_ORDER = ["FOCUS", "NEW_PRODUCT", "REVAMP", "EXIT", "INFRA", "KTLO", "RND", "COMPLIANCE"] as const

const BUCKET_TAB_LABELS: Record<string, string> = {
  FOCUS:       "Focus",
  NEW_PRODUCT: "New Product",
  REVAMP:      "Revamp Plan",
  EXIT:        "Exit Plan",
  INFRA:       "Infra & Enabler",
  KTLO:        "KTLO",
  RND:         "R&D / PoC",
  COMPLIANCE:  "Compliance",
}

interface BucketTabsProps {
  counts: Record<string, number>
  total: number
}

export function PortfolioTabs({ counts, total }: BucketTabsProps) {
  const { activeBucket, setActiveBucket } = useDashboardStore()

  const visibleBuckets = BUCKET_ORDER.filter((key) => (counts[key] ?? 0) > 0)

  return (
    <div className="border-b border-border bg-card px-6">
      <div className="flex gap-0 overflow-x-auto">
        {/* All tab */}
        <button
          onClick={() => setActiveBucket("all")}
          className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 ${
            activeBucket === "all"
              ? "border-accent text-accent"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          All
          <span className={`text-xs px-1.5 py-0.5 rounded-badge font-semibold ${activeBucket === "all" ? "bg-accent text-white" : "bg-gray-100 text-text-muted"}`}>
            {total}
          </span>
        </button>

        {visibleBuckets.map((key) => {
          const active = activeBucket === key
          return (
            <button
              key={key}
              onClick={() => setActiveBucket(key)}
              className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              {BUCKET_TAB_LABELS[key] ?? key}
              <span className={`text-xs px-1.5 py-0.5 rounded-badge font-semibold ${active ? "bg-accent text-white" : "bg-gray-100 text-text-muted"}`}>
                {counts[key]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
