"use client"

import { SlidePanel } from "@/components/ui/SlidePanel"
import { SpendTrendChart, type TrendPoint } from "@/components/vendors/SpendTrendChart"
import { formatDateShort } from "@/lib/utils/date"
import type { VendorSummary } from "@/components/vendors/VendorCard"

export interface VendorOrderRow {
  id: string
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
  stillToInvoiceValue: number | null
  stillToDeliverValue: number | null
}

const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 border-b border-border">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

interface VendorDetailPanelProps {
  vendor: VendorSummary | null
  orders: VendorOrderRow[]
  trend: TrendPoint[]
  onClose: () => void
}

export function VendorDetailPanel({ vendor, orders, trend, onClose }: VendorDetailPanelProps) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.docDate).getTime() - new Date(a.docDate).getTime())
  const topOrders = [...orders].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5)

  return (
    <SlidePanel open={!!vendor} onClose={onClose} width="w-[820px]">
      {vendor && (
        <>
          {/* Header */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: vendor.color }} />
              <span className="text-xs text-text-muted">Vendor Code: {vendor.vendorCode}</span>
            </div>
            <h2 className="text-xl font-bold text-text-primary">{vendor.vendorName}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted mt-2">
              <span>Total Spend: <strong className="text-text-primary">{fmtBaht(vendor.totalValue)} ฿</strong></span>
              <span>{vendor.poCount} PO{vendor.poCount !== 1 ? "s" : ""} · {vendor.itemCount} งาน</span>
              <span>{formatDateShort(vendor.minDate)} → {formatDateShort(vendor.maxDate)}</span>
              {vendor.outstanding > 0 && (
                <span className="text-rag-amber-text font-medium">⚠ ค้าง Invoice {fmtBaht(vendor.outstanding)} ฿</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Spend trend */}
            <Section title="Spend by Year">
              <SpendTrendChart data={trend} color={vendor.color} height={100} />
            </Section>

            {/* Top engagements */}
            <Section title="Top Engagements">
              <div className="flex flex-col gap-2">
                {topOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate">{o.description}</p>
                      <p className="text-xs text-text-muted">PO {o.poNumber}-{o.item} · {formatDateShort(o.docDate)}</p>
                    </div>
                    <span className="font-semibold tabular-nums shrink-0" style={{ color: vendor.color }}>
                      {fmtBaht(o.totalValue)} ฿
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Full order history */}
            <Section title={`Order History (${orders.length})`}>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }} className="text-text-muted">
                      <th className="text-left py-2 pr-3 font-medium">PO</th>
                      <th className="text-left py-2 pr-3 font-medium">Date</th>
                      <th className="text-left py-2 pr-3 font-medium">Description</th>
                      <th className="text-right py-2 pr-3 font-medium">Qty</th>
                      <th className="text-right py-2 pr-3 font-medium">Net Price</th>
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td className="py-2 pr-3 whitespace-nowrap text-text-muted">{o.poNumber}-{o.item}</td>
                        <td className="py-2 pr-3 whitespace-nowrap text-text-muted">{formatDateShort(o.docDate)}</td>
                        <td className="py-2 pr-3 text-text-primary" style={{ maxWidth: 260 }}>{o.description}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-text-muted whitespace-nowrap">
                          {o.orderQty} {o.orderUnit ?? ""}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-text-muted whitespace-nowrap">
                          {fmtBaht(o.netPrice)} ฿
                        </td>
                        <td className="py-2 text-right tabular-nums font-semibold text-text-primary whitespace-nowrap">
                          {fmtBaht(o.totalValue)} ฿
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        </>
      )}
    </SlidePanel>
  )
}
