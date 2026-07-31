"use client"

import { useMemo, useState } from "react"
import { VendorSummaryCards } from "@/components/vendors/VendorSummaryCards"
import { VendorSpendChart, type VendorSpendSlice } from "@/components/vendors/VendorSpendChart"
import { VendorCard, type VendorSummary } from "@/components/vendors/VendorCard"
import { VendorDetailPanel, type VendorOrderRow } from "@/components/vendors/VendorDetailPanel"
import { SpendTrendChart, type TrendPoint } from "@/components/vendors/SpendTrendChart"
import { TopOrdersSection, type TopOrderRow } from "@/components/vendors/TopOrdersSection"

interface RawVendorOrder {
  id: string
  vendorCode: string
  vendorName: string
  poNumber: string
  item: string
  docDate: string
  description: string
  materialGroup: string | null
  orderQty: number
  orderUnit: string | null
  netPrice: number
  currency: string
  totalValue: number
  stillToDeliverValue: number | null
  stillToInvoiceValue: number | null
}

const PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899"]

interface VendorsClientProps {
  orders: RawVendorOrder[]
}

export function VendorsClient({ orders }: VendorsClientProps) {
  const [selectedVendorCode, setSelectedVendorCode] = useState<string | null>(null)

  // ── Aggregate per-vendor summaries ──
  const vendors: VendorSummary[] = useMemo(() => {
    const map = new Map<string, VendorSummary & { pos: Set<string> }>()
    for (const o of orders) {
      let v = map.get(o.vendorCode)
      if (!v) {
        v = {
          vendorCode: o.vendorCode,
          vendorName: o.vendorName,
          totalValue: 0,
          poCount: 0,
          itemCount: 0,
          minDate: o.docDate,
          maxDate: o.docDate,
          outstanding: 0,
          color: "#6366F1",
          pos: new Set(),
        }
        map.set(o.vendorCode, v)
      }
      v.totalValue += o.totalValue
      v.itemCount += 1
      v.pos.add(o.poNumber)
      v.outstanding += o.stillToInvoiceValue ?? 0
      if (o.docDate < v.minDate) v.minDate = o.docDate
      if (o.docDate > v.maxDate) v.maxDate = o.docDate
    }
    const list = Array.from(map.values())
      .map((v) => ({ ...v, poCount: v.pos.size }))
      .sort((a, b) => b.totalValue - a.totalValue)
    list.forEach((v, i) => { v.color = PALETTE[i % PALETTE.length] })
    return list.map(({ pos, ...rest }) => rest)
  }, [orders])

  const vendorColor = useMemo(() => {
    const m: Record<string, string> = {}
    vendors.forEach((v) => { m[v.vendorCode] = v.color })
    return m
  }, [vendors])

  // ── Overall totals ──
  const totalSpend = orders.reduce((s, o) => s + o.totalValue, 0)
  const totalOutstanding = orders.reduce((s, o) => s + (o.stillToInvoiceValue ?? 0), 0)
  const totalPOs = new Set(orders.map((o) => o.poNumber)).size

  // ── Donut chart data ──
  const spendSlices: VendorSpendSlice[] = vendors.map((v) => ({
    vendorCode: v.vendorCode,
    vendorName: v.vendorName,
    value: v.totalValue,
    percent: totalSpend > 0 ? Math.round((v.totalValue / totalSpend) * 1000) / 10 : 0,
    color: v.color,
  }))

  // ── Overall yearly trend ──
  const overallTrend: TrendPoint[] = useMemo(() => {
    const byYear = new Map<string, number>()
    for (const o of orders) {
      const year = String(new Date(o.docDate).getFullYear())
      byYear.set(year, (byYear.get(year) ?? 0) + o.totalValue)
    }
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }))
  }, [orders])

  // ── Top 10 engagements overall ──
  const topOrders: TopOrderRow[] = useMemo(() => {
    return [...orders]
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((o) => ({
        id: o.id,
        vendorName: o.vendorName,
        poNumber: o.poNumber,
        item: o.item,
        docDate: o.docDate,
        description: o.description,
        totalValue: o.totalValue,
        color: vendorColor[o.vendorCode] ?? "#6366F1",
      }))
  }, [orders, vendorColor])

  // ── Selected vendor detail ──
  const selectedVendor = vendors.find((v) => v.vendorCode === selectedVendorCode) ?? null
  const selectedOrders: VendorOrderRow[] = useMemo(() => {
    if (!selectedVendorCode) return []
    return orders
      .filter((o) => o.vendorCode === selectedVendorCode)
      .map((o) => ({
        id: o.id,
        poNumber: o.poNumber,
        item: o.item,
        docDate: o.docDate,
        description: o.description,
        materialGroup: o.materialGroup,
        orderQty: o.orderQty,
        orderUnit: o.orderUnit,
        netPrice: o.netPrice,
        currency: o.currency,
        totalValue: o.totalValue,
        stillToInvoiceValue: o.stillToInvoiceValue,
        stillToDeliverValue: o.stillToDeliverValue,
      }))
  }, [orders, selectedVendorCode])

  const selectedTrend: TrendPoint[] = useMemo(() => {
    if (!selectedVendorCode) return []
    const byYear = new Map<string, number>()
    for (const o of orders) {
      if (o.vendorCode !== selectedVendorCode) continue
      const year = String(new Date(o.docDate).getFullYear())
      byYear.set(year, (byYear.get(year) ?? 0) + o.totalValue)
    }
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }))
  }, [orders, selectedVendorCode])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-5 pb-1">
        <h1 className="text-xl font-bold text-text-primary">Vendor Management</h1>
        <p className="text-sm text-text-muted mt-0.5">
          ประวัติการจัดจ้าง Vendor พัฒนา Software ทั้งหมด — นำเข้าจาก SAP Purchase Order
        </p>
      </div>

      <VendorSummaryCards
        totalSpend={totalSpend}
        vendorCount={vendors.length}
        poCount={totalPOs}
        outstanding={totalOutstanding}
      />

      <div className="grid grid-cols-3 gap-4 px-6 pb-4">
        {/* Spend by vendor donut */}
        <div className="col-span-1 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Spend by Vendor</span>
          </div>
          <VendorSpendChart data={spendSlices} />
        </div>

        {/* Yearly trend */}
        <div className="col-span-2 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Spend Over Time (Yearly)</span>
          </div>
          <div className="px-5 py-6">
            <SpendTrendChart data={overallTrend} />
          </div>
        </div>
      </div>

      {/* Vendor cards */}
      <div className="px-6 pb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Vendors ({vendors.length})</p>
        <div className="grid grid-cols-3 gap-4">
          {vendors.map((v) => (
            <VendorCard key={v.vendorCode} vendor={v} onClick={() => setSelectedVendorCode(v.vendorCode)} />
          ))}
        </div>
      </div>

      {/* Top engagements */}
      <div className="px-6 py-4 pb-8">
        <TopOrdersSection orders={topOrders} />
      </div>

      <VendorDetailPanel
        vendor={selectedVendor}
        orders={selectedOrders}
        trend={selectedTrend}
        onClose={() => setSelectedVendorCode(null)}
      />
    </div>
  )
}
