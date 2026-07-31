import { formatDateShort } from "@/lib/utils/date"

const fmtBaht = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

export interface TopOrderRow {
  id: string
  vendorName: string
  poNumber: string
  item: string
  docDate: string
  description: string
  totalValue: number
  color: string
}

export function TopOrdersSection({ orders }: { orders: TopOrderRow[] }) {
  const max = Math.max(1, ...orders.map((o) => o.totalValue))

  return (
    <div className="rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Top 10 Engagements (มูลค่าสูงสุด)
        </span>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {orders.map((o, i) => (
          <div key={o.id} className="flex items-center gap-3">
            <span className="text-xs font-semibold w-4 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>{o.description}</p>
                <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: o.color }}>
                  {fmtBaht(o.totalValue)} ฿
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full mb-1" style={{ background: "var(--color-surface)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(o.totalValue / max) * 100}%`, background: o.color }}
                />
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {o.vendorName} · PO {o.poNumber}-{o.item} · {formatDateShort(o.docDate)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
