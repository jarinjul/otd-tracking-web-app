"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { BUCKET_LABELS } from "@/lib/types"

// ─── Types (shape returned by /api/admin/cost-coverage) ──────────────────────

type ReleaseCodes = {
  id: string
  version: string
  workforce: string
  costCenter: string
  costElement: string
  ioNumber: string
}
type AiCredit = { modelsAi: string; costModel: number | null }
type Row = {
  id: string
  name: string
  bucket: string | null
  releaseCount: number
  wf: number
  cc: number
  ce: number
  io: number
  releases: ReleaseCodes[]
  aiCredits: AiCredit[]
  aiCount: number
  aiTotal: number
}

type Filter = "all" | "sap-incomplete" | "ai-spend"
type SortKey = "name" | "releases" | "sapPct" | "aiCount" | "aiTotal"

// ─── Helpers ────────────────────────────────────────────────────────────────

const nf = new Intl.NumberFormat("en-US")
const sapPct = (r: Row) =>
  r.releaseCount ? Math.round(((r.wf + r.cc + r.ce + r.io) / (r.releaseCount * 4)) * 100) : 0
const sapIncomplete = (r: Row) => [r.wf, r.cc, r.ce, r.io].some((n) => n < r.releaseCount)
const sapComplete = (r: Row) => r.releaseCount > 0 && [r.wf, r.cc, r.ce, r.io].every((n) => n >= r.releaseCount)

type State = "full" | "partial" | "none"
function covState(n: number, total: number): State {
  if (total === 0 || n === 0) return "none"
  return n >= total ? "full" : "partial"
}
const STATE_COLOR: Record<State, string> = {
  full: "var(--color-rag-green-text)",
  partial: "var(--color-rag-amber-text)",
  none: "var(--color-text-muted)",
}
const STATE_BAR: Record<State, string> = {
  full: "var(--color-rag-green)",
  partial: "var(--color-rag-amber)",
  none: "var(--color-border)",
}

// ─── Small presentational bits ──────────────────────────────────────────────

function CovCell({ n, total }: { n: number; total: number }) {
  const st = covState(n, total)
  const pct = total ? Math.round((n / total) * 100) : 0
  return (
    <td className="px-3 py-2">
      <div className="flex flex-col gap-1 w-[52px]">
        <span className="text-sm font-bold tabular-nums leading-none" style={{ color: STATE_COLOR[st] }}>
          {n}
          <span className="text-[10.5px] font-medium" style={{ color: "var(--color-text-muted)" }}> / {total}</span>
        </span>
        <span className="h-[3px] rounded-sm overflow-hidden" style={{ background: "var(--color-border)" }}>
          <span className="block h-full rounded-sm" style={{ width: `${pct}%`, background: STATE_BAR[st] }} />
        </span>
      </div>
    </td>
  )
}

function Code({ value }: { value: string }) {
  if (!value.trim()) {
    return (
      <span
        className="inline-block rounded border border-dashed px-1.5 py-px text-[11px] font-mono"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        —
      </span>
    )
  }
  return (
    <span
      className="inline-block rounded border px-1.5 py-px text-[11px] font-mono"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
    >
      {value}
    </span>
  )
}

// ─── Panel ─────────────────────────────────────────────────────────────────

export function CostCoveragePanel({
  onEditProject,
}: {
  onEditProject?: (panel: "releases" | "projects", projectId: string) => void
} = {}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("aiTotal")
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [open, setOpen] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/cost-coverage")
      if (!res.ok) throw new Error()
      setRows(await res.json())
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const view = useMemo(() => {
    let r = rows.filter((row) => {
      if (filter === "ai-spend") return row.aiTotal > 0
      if (filter === "sap-incomplete") return sapIncomplete(row)
      return true
    })
    const val = (row: Row) =>
      sortKey === "releases"
        ? row.releaseCount
        : sortKey === "sapPct"
        ? sapPct(row)
        : sortKey === "aiCount"
        ? row.aiCount
        : row.aiTotal
    r = [...r].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * sortDir
      return (val(a) - val(b)) * sortDir || a.name.localeCompare(b.name)
    })
    return r
  }, [rows, filter, sortKey, sortDir])

  const totals = useMemo(() => {
    const sum = (f: (r: Row) => number) => view.reduce((s, r) => s + f(r), 0)
    const relSum = sum((r) => r.releaseCount)
    const codeSum = sum((r) => r.wf + r.cc + r.ce + r.io)
    return {
      releases: relSum,
      wf: sum((r) => r.wf),
      cc: sum((r) => r.cc),
      ce: sum((r) => r.ce),
      io: sum((r) => r.io),
      aiCount: sum((r) => r.aiCount),
      aiTotal: sum((r) => r.aiTotal),
      sapPct: relSum ? Math.round((codeSum / (relSum * 4)) * 100) : 0,
    }
  }, [view])

  const stats = useMemo(() => {
    const relSum = rows.reduce((s, r) => s + r.releaseCount, 0)
    const fully = rows.filter(sapComplete).length
    const aiLines = rows.reduce((s, r) => s + r.aiCount, 0)
    const aiTotal = rows.reduce((s, r) => s + r.aiTotal, 0)
    const projWithAi = rows.filter((r) => r.aiCount > 0).length
    return { projects: rows.length, relSum, fully, aiLines, aiTotal, projWithAi }
  }, [rows])

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(key === "name" ? 1 : -1)
    }
  }

  const thBase = "px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wide whitespace-nowrap"
  const thStyle = { color: "var(--color-text-muted)", background: "var(--color-surface)" }
  const caret = (key: SortKey) => (sortKey === key ? (sortDir === -1 ? " ▼" : " ▲") : "")

  return (
    <div className="p-8">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        Admin › Cost &amp; AI Coverage
      </div>
      <div className="flex items-start justify-between gap-5 mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Cost &amp; AI Coverage
          </h1>
          <p className="text-sm mt-1 max-w-[70ch]" style={{ color: "var(--color-text-muted)" }}>
            ทุกโปรเจกต์ในที่เดียว — นับว่าแต่ละโปรเจกต์กรอก Workforce / Cost Center / Cost Element / IO Number
            ครบกี่ release แล้ว และซื้อ Models AI ไปกี่รายการ รวมเป็นเงินเท่าไร
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-lg border font-medium shrink-0"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
        >
          Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))" }}>
        {[
          { label: "Projects", value: nf.format(stats.projects), sub: "ดึงมาทั้งหมด" },
          { label: "Releases", value: nf.format(stats.relSum), sub: "ที่นับ field บัญชี" },
          {
            label: "SAP ครบทุก field",
            value: `${stats.fully} / ${stats.projects}`,
            sub: "โปรเจกต์ที่กรอกครบทุก release",
          },
          { label: "AI Credit — รายการ", value: nf.format(stats.aiLines), sub: `${stats.projWithAi} โปรเจกต์มีการซื้อ` },
          { label: "AI Spend รวม", value: `฿ ${nf.format(stats.aiTotal)}`, sub: "รวมทุกโปรเจกต์", accent: true },
        ].map((t) => (
          <div
            key={t.label}
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {t.label}
            </div>
            <div
              className="mt-1.5 text-2xl font-bold tabular-nums"
              style={{ color: t.accent ? "var(--color-accent)" : "var(--color-text-primary)" }}
            >
              {t.value}
            </div>
            <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
              {t.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div
          className="inline-flex rounded-lg border p-[3px] gap-[2px]"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          {([
            ["all", "ทั้งหมด"],
            ["sap-incomplete", "SAP ไม่ครบ"],
            ["ai-spend", "มีค่าใช้จ่าย AI"],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-2.5 py-1 rounded-md text-[12.5px] font-medium"
              style={
                filter === key
                  ? { background: "var(--color-card)", color: "var(--color-text-primary)", fontWeight: 600 }
                  : { color: "var(--color-text-muted)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs" style={{ color: "var(--color-text-muted)" }}>
          แสดง <b style={{ color: "var(--color-text-primary)" }}>{view.length}</b> จาก{" "}
          <b style={{ color: "var(--color-text-primary)" }}>{rows.length}</b> โปรเจกต์
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px]" style={{ borderCollapse: "collapse", color: "var(--color-text-primary)" }}>
            <thead>
              <tr>
                <th className={thBase} style={thStyle}>Project</th>
                <th className={thBase + " text-right cursor-pointer"} style={thStyle} onClick={() => sortBy("releases")}>
                  Releases{caret("releases")}
                </th>
                <th className={thBase + " cursor-pointer"} style={thStyle} onClick={() => sortBy("sapPct")}>
                  SAP %{caret("sapPct")}
                </th>
                <th className={thBase} style={thStyle}>Workforce</th>
                <th className={thBase} style={thStyle}>Cost Center</th>
                <th className={thBase} style={thStyle}>Cost Element</th>
                <th className={thBase} style={thStyle}>IO Number</th>
                <th className={thBase + " text-right cursor-pointer"} style={thStyle} onClick={() => sortBy("aiCount")}>
                  AI Credits{caret("aiCount")}
                </th>
                <th className={thBase + " text-right cursor-pointer"} style={thStyle} onClick={() => sortBy("aiTotal")}>
                  AI Spend (฿){caret("aiTotal")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm" style={{ color: "var(--color-rag-red-text)" }}>
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && view.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    ไม่มีโปรเจกต์ที่ตรงกับตัวกรอง
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                view.map((r) => {
                  const isOpen = open.has(r.id)
                  const pct = sapPct(r)
                  const pctSt = r.releaseCount === 0 ? "none" : pct >= 100 ? "full" : pct === 0 ? "none" : "partial"
                  return (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => toggle(r.id)}
                        className="cursor-pointer"
                        style={{ borderTop: "1px solid var(--color-border-muted)" }}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            <span
                              className="text-[10px] inline-block transition-transform"
                              style={{ transform: isOpen ? "rotate(90deg)" : "none", color: isOpen ? "var(--color-accent)" : "var(--color-text-muted)" }}
                            >
                              ▶
                            </span>
                            {r.name}
                          </div>
                          <span
                            className="inline-block mt-1 ml-4 text-[10.5px] rounded-full border px-1.5"
                            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                          >
                            {r.bucket ? BUCKET_LABELS[r.bucket] ?? r.bucket : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: "var(--color-text-muted)" }}>
                          {r.releaseCount}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 w-[76px]">
                            <span className="text-xs font-bold tabular-nums" style={{ color: STATE_COLOR[pctSt as State] }}>
                              {pct}%
                            </span>
                            <span className="flex-1 h-[3px] rounded-sm overflow-hidden" style={{ background: "var(--color-border)" }}>
                              <span className="block h-full rounded-sm" style={{ width: `${pct}%`, background: STATE_BAR[pctSt as State] }} />
                            </span>
                          </div>
                        </td>
                        <CovCell n={r.wf} total={r.releaseCount} />
                        <CovCell n={r.cc} total={r.releaseCount} />
                        <CovCell n={r.ce} total={r.releaseCount} />
                        <CovCell n={r.io} total={r.releaseCount} />
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
                            style={
                              r.aiCount
                                ? { background: "var(--color-accent-light)", color: "var(--color-accent)" }
                                : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
                            }
                          >
                            {r.aiCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold" style={{ color: r.aiTotal ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                          {r.aiTotal ? (
                            <>
                              <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>฿ </span>
                              {nf.format(r.aiTotal)}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr style={{ background: "var(--color-accent-light)" }}>
                          <td colSpan={9} className="px-4 pb-5 pt-1 pl-10">
                            <div className="grid gap-5" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
                              <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                                    SAP codes ราย release
                                  </div>
                                  {onEditProject && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onEditProject("releases", r.id)
                                      }}
                                      className="text-[11px] px-2 py-1 rounded-md border font-medium whitespace-nowrap"
                                      style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
                                    >
                                      แก้ที่ Releases →
                                    </button>
                                  )}
                                </div>
                                {r.releases.length === 0 ? (
                                  <div className="text-xs py-1" style={{ color: "var(--color-text-muted)" }}>
                                    โปรเจกต์นี้ยังไม่มี release
                                  </div>
                                ) : (
                                  <table className="w-full" style={{ borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr>
                                        {["Release", "Workforce", "Cost Center", "Cost Element", "IO Number"].map((h) => (
                                          <th
                                            key={h}
                                            className="text-left px-2 py-1.5 text-[10.5px] font-semibold"
                                            style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border-muted)" }}
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.releases.map((rel) => (
                                        <tr key={rel.id}>
                                          <td className="px-2 py-1.5 text-xs" style={{ color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border-muted)" }}>
                                            {rel.version}
                                          </td>
                                          {[rel.workforce, rel.costCenter, rel.costElement, rel.ioNumber].map((v, i) => (
                                            <td key={i} className="px-2 py-1.5" style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
                                              <Code value={v} />
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>

                              <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                                    AI Credits (Develop)
                                  </div>
                                  {onEditProject && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onEditProject("projects", r.id)
                                      }}
                                      className="text-[11px] px-2 py-1 rounded-md border font-medium whitespace-nowrap"
                                      style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
                                    >
                                      แก้ที่ Projects →
                                    </button>
                                  )}
                                </div>
                                {r.aiCredits.length === 0 ? (
                                  <div className="text-xs py-1" style={{ color: "var(--color-text-muted)" }}>
                                    ยังไม่มีรายการ Models AI ที่ซื้อสำหรับโปรเจกต์นี้
                                  </div>
                                ) : (
                                  <>
                                    {r.aiCredits.map((c, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]"
                                        style={{ borderBottom: i < r.aiCredits.length - 1 ? "1px solid var(--color-border-muted)" : "none" }}
                                      >
                                        <span style={{ color: "var(--color-text-primary)" }}>{c.modelsAi || "—"}</span>
                                        <span className="tabular-nums font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                          <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>฿ </span>
                                          {c.costModel != null ? nf.format(c.costModel) : "—"}
                                        </span>
                                      </div>
                                    ))}
                                    <div
                                      className="flex items-center justify-between mt-2 pt-2 text-xs font-bold"
                                      style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                                    >
                                      <span>รวม</span>
                                      <span className="tabular-nums">
                                        <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>฿ </span>
                                        {nf.format(r.aiTotal)}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
            </tbody>
            {!loading && !error && view.length > 0 && (
              <tfoot>
                <tr>
                  <td className="px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ borderTop: "2px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
                    รวม {view.length} โปรเจกต์
                  </td>
                  {[totals.releases, `${totals.sapPct}%`, totals.wf, totals.cc, totals.ce, totals.io, totals.aiCount].map((v, i) => (
                    <td
                      key={i}
                      className={"px-3 py-2.5 text-xs font-bold tabular-nums" + (i === 0 || i >= 2 ? " text-right" : "")}
                      style={{ borderTop: "2px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                    >
                      {v}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-xs font-bold tabular-nums text-right" style={{ borderTop: "2px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>฿ </span>
                    {nf.format(totals.aiTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap mt-3.5 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-[22px] h-[3px] rounded-sm" style={{ background: "var(--color-rag-green)" }} /> ครบทุก release
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-[22px] h-[3px] rounded-sm" style={{ background: "var(--color-rag-amber)" }} /> กรอกบางส่วน
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-[22px] h-[3px] rounded-sm" style={{ background: "var(--color-border)" }} /> ยังไม่มีข้อมูล
        </span>
      </div>

      <p className="mt-4 text-xs pl-3 max-w-[72ch]" style={{ color: "var(--color-text-muted)", borderLeft: "2px solid var(--color-border)" }}>
        ตัวเลขในช่อง Workforce / Cost Center / Cost Element / IO Number คือ “จำนวน release ที่กรอกช่องนั้นแล้ว”
        เทียบกับจำนวน release ทั้งหมด (เช่น <b style={{ color: "var(--color-text-primary)" }}>3 / 4</b>). คลิกที่แถวเพื่อดู
        SAP codes ราย release และรายการ AI ที่ซื้อ พร้อมปุ่มลัดไปแก้ที่แท็บ
        <b style={{ color: "var(--color-text-primary)" }}> Releases</b> (Workforce / Cost Center / Cost Element / IO Number)
        และ <b style={{ color: "var(--color-text-primary)" }}>Projects</b> (Models AI + Cost Model) ของโปรเจกต์นั้นโดยตรง.
      </p>
    </div>
  )
}
