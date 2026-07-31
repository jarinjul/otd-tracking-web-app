const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

interface VendorSummaryCardsProps {
  totalSpend: number
  vendorCount: number
  poCount: number
  outstanding: number
}

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className="flex-1 flex flex-col gap-1 px-5 py-4 rounded-card bg-card border-2"
      style={{
        borderColor: accent ? "var(--color-accent)" : "transparent",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold text-text-primary">{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  )
}

export function VendorSummaryCards({ totalSpend, vendorCount, poCount, outstanding }: VendorSummaryCardsProps) {
  return (
    <div className="flex gap-4 px-6 py-4">
      <Card label="Total Spend" value={`${fmtBaht(totalSpend)} ฿`} accent />
      <Card label="Vendors" value={String(vendorCount)} />
      <Card label="Purchase Orders" value={String(poCount)} />
      <Card
        label="Outstanding (ยังไม่ Invoice)"
        value={`${fmtBaht(outstanding)} ฿`}
        sub={outstanding > 0 ? "รอออกใบแจ้งหนี้" : "ปิดครบแล้ว"}
      />
    </div>
  )
}
