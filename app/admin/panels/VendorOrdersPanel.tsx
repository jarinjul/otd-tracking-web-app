"use client"

import { useEffect, useState, useCallback, useRef } from "react"

type VendorOrderRow = {
  id: string
  vendorCode: string
  vendorName: string
  poNumber: string
  item: string
  docDate: string
  description: string
  orderQty: number
  orderUnit: string | null
  netPrice: number
  currency: string
  totalValue: number
  stillToInvoiceValue: number | null
}

type ImportResult = {
  totalRows: number
  created: number
  updated: number
  skipped: number
  errors: string[]
  errorCount: number
}

const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

export function VendorOrdersPanel() {
  const [orders, setOrders] = useState<VendorOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [vendorFilter, setVendorFilter] = useState<string>("all")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/vendor-orders")
      setOrders(await res.json())
    } catch {
      showFeedback("error", "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 5000)
  }

  async function handleFile(file: File) {
    setUploading(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/vendor-orders/import", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Import failed")
      }
      const result: ImportResult = await res.json()
      setImportResult(result)
      showFeedback(
        "success",
        `Imported ${result.totalRows} rows — ${result.created} new, ${result.updated} updated${result.skipped ? `, ${result.skipped} skipped` : ""}`
      )
      await load()
    } catch (e) {
      showFeedback("error", e instanceof Error ? e.message : "Import failed — check the file format")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/admin/vendor-orders/${id}`, { method: "DELETE" })
      showFeedback("success", "Record deleted")
      setConfirmDelete(null)
      await load()
    } catch {
      showFeedback("error", "Delete failed")
    }
  }

  const vendors = Array.from(new Set(orders.map((o) => o.vendorName))).sort()
  const filtered = vendorFilter === "all" ? orders : orders.filter((o) => o.vendorName === vendorFilter)
  const totalSpend = filtered.reduce((s, o) => s + o.totalValue, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Vendor Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {orders.length} records — นำเข้าจาก SAP PO History Export
          </p>
        </div>
      </div>

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

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl border-2 border-dashed mb-6 px-6 py-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--color-accent)" : "var(--color-border)",
          background: dragOver ? "var(--color-accent-light)" : "white",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {uploading ? (
          <p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>Importing…</p>
        ) : (
          <>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              ลากไฟล์ Excel มาวาง หรือคลิกเพื่อเลือกไฟล์
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              รองรับไฟล์ SAP PO History export (.xlsx) — ระบบจะกันข้อมูลซ้ำด้วย PO + Item อัตโนมัติ
            </p>
          </>
        )}
      </div>

      {/* Import result detail */}
      {importResult && importResult.errorCount > 0 && (
        <div className="mb-6 rounded-xl border p-4" style={{ borderColor: "var(--color-rag-amber)", background: "var(--color-rag-amber-light)" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-rag-amber-text)" }}>
            {importResult.errorCount} แถวมีปัญหา (แสดงสูงสุด {importResult.errors.length} รายการ)
          </p>
          <ul className="text-xs flex flex-col gap-1" style={{ color: "var(--color-rag-amber-text)" }}>
            {importResult.errors.map((err, i) => <li key={i}>• {err}</li>)}
          </ul>
        </div>
      )}

      {/* Vendor filter + total */}
      <div className="flex items-center justify-between mb-4">
        <select
          className="px-3 py-2 text-sm rounded-lg border"
          style={{ borderColor: "var(--color-border)", background: "white", color: "var(--color-text-primary)" }}
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
        >
          <option value="all">All Vendors</option>
          {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {filtered.length} records — <strong style={{ color: "var(--color-text-primary)" }}>{fmtBaht(totalSpend)} ฿</strong>
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--color-border)", background: "white" }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No vendor orders yet. Upload a file above to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                {["Vendor", "PO", "Date", "Description", "Qty", "Net Price", "Total", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.id} style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text-primary)" }}>{o.vendorName}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{o.poNumber}-{o.item}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(o.docDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-primary)", maxWidth: 260 }}>{o.description}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{o.orderQty} {o.orderUnit ?? ""}</td>
                  <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{fmtBaht(o.netPrice)} ฿</td>
                  <td className="px-4 py-3 text-xs tabular-nums font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{fmtBaht(o.totalValue)} ฿</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDelete(o.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-rag-red)" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div className="fixed z-50 rounded-xl p-6 shadow-xl" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, background: "white" }}>
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--color-text-primary)" }}>Delete Record?</h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>This vendor order record will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg text-sm border font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--color-rag-red)" }}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
