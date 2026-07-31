import { formatDateShort } from "@/lib/utils/date"

export interface VendorSummary {
  vendorCode: string
  vendorName: string
  totalValue: number
  poCount: number
  itemCount: number
  minDate: string
  maxDate: string
  outstanding: number
  color: string
}

const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

interface VendorCardProps {
  vendor: VendorSummary
  onClick: () => void
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-card border-l-4 cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderLeftColor: vendor.color, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-text-primary text-base leading-tight">{vendor.vendorName}</h3>
          <p className="text-xs text-text-muted mt-0.5">Vendor Code: {vendor.vendorCode}</p>
        </div>

        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-0.5">Total Spend</p>
          <p className="text-2xl font-bold" style={{ color: vendor.color }}>{fmtBaht(vendor.totalValue)} ฿</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>{vendor.poCount} PO{vendor.poCount !== 1 ? "s" : ""}</span>
          <span>{vendor.itemCount} งาน</span>
        </div>

        <div className="text-xs text-text-muted">
          {formatDateShort(vendor.minDate)} → {formatDateShort(vendor.maxDate)}
        </div>

        {vendor.outstanding > 0 && (
          <div className="flex items-center gap-1 text-xs text-rag-amber-text bg-rag-amber-light px-2 py-1 rounded-badge w-fit">
            ⚠ ค้าง Invoice {fmtBaht(vendor.outstanding)} ฿
          </div>
        )}
      </div>
    </div>
  )
}
