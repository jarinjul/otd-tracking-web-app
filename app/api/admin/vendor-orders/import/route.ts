import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { prisma } from "@/lib/prisma"

// Column names as they appear in the SAP PO history export.
const COL = {
  vendor: "Vendor/supplying plant",
  po: "Purchasing Document",
  item: "Item",
  docType: "Purchasing Doc. Type",
  docDate: "Document Date",
  desc: "Short Text",
  materialGroup: "Material Group",
  qty: "Order Quantity",
  unit: "Order Unit",
  netPrice: "Net price",
  priceUnit: "Price Unit",
  currency: "Currency",
  stdQty: "Still to be delivered (qty)",
  stdVal: "Still to be delivered (value)",
  stiQty: "Still to be invoiced (qty)",
  stiVal: "Still to be invoiced (val.)",
} as const

function splitVendor(raw: string): { code: string; name: string } {
  const trimmed = String(raw ?? "").trim()
  const spaceIdx = trimmed.search(/\s/)
  if (spaceIdx === -1) return { code: trimmed, name: trimmed }
  return { code: trimmed.slice(0, spaceIdx), name: trimmed.slice(spaceIdx).trim() }
}

function excelDateToJs(val: unknown): Date | null {
  if (val == null || val === "") return null
  if (val instanceof Date) return val
  if (typeof val === "number") {
    // Excel serial date → JS Date (days since 1899-12-30)
    const ms = Math.round((val - 25569) * 86400 * 1000)
    return new Date(ms)
  }
  const parsed = new Date(String(val))
  return isNaN(parsed.getTime()) ? null : parsed
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get("file")
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null })

  if (rows.length === 0) {
    return Response.json({ error: "Sheet is empty or unreadable" }, { status: 400 })
  }

  // Track name preference: keep whichever occurrence looks like the English "CO.,LTD" form
  const vendorNamePref = new Map<string, string>()
  for (const row of rows) {
    const { code, name } = splitVendor(row[COL.vendor] as string)
    if (!code) continue
    const existing = vendorNamePref.get(code)
    if (!existing || name.toUpperCase().includes("CO.,LTD")) {
      vendorNamePref.set(code, name)
    }
  }

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const vendorRaw = row[COL.vendor]
      const po = row[COL.po]
      const item = row[COL.item]
      if (!vendorRaw || !po || item == null) {
        skipped++
        continue
      }

      const { code } = splitVendor(vendorRaw as string)
      const vendorName = vendorNamePref.get(code) ?? code
      const docDate = excelDateToJs(row[COL.docDate])
      if (!docDate) {
        skipped++
        continue
      }

      const qty = Number(row[COL.qty]) || 0
      const netPrice = Number(row[COL.netPrice]) || 0
      const priceUnit = Number(row[COL.priceUnit]) || 1
      const totalValue = (qty * netPrice) / priceUnit

      const data = {
        vendorCode: code,
        vendorName,
        poNumber: String(po),
        item: String(item),
        docType: row[COL.docType] ? String(row[COL.docType]) : null,
        docDate,
        description: row[COL.desc] ? String(row[COL.desc]) : "(no description)",
        materialGroup: row[COL.materialGroup] ? String(row[COL.materialGroup]) : null,
        orderQty: qty,
        orderUnit: row[COL.unit] ? String(row[COL.unit]) : null,
        netPrice,
        priceUnit,
        currency: row[COL.currency] ? String(row[COL.currency]) : "THB",
        totalValue,
        stillToDeliverQty: row[COL.stdQty] != null ? Number(row[COL.stdQty]) : null,
        stillToDeliverValue: row[COL.stdVal] != null ? Number(row[COL.stdVal]) : null,
        stillToInvoiceQty: row[COL.stiQty] != null ? Number(row[COL.stiQty]) : null,
        stillToInvoiceValue: row[COL.stiVal] != null ? Number(row[COL.stiVal]) : null,
      }

      const existing = await prisma.vendorOrder.findUnique({
        where: { poNumber_item: { poNumber: data.poNumber, item: data.item } },
        select: { id: true },
      })

      await prisma.vendorOrder.upsert({
        where: { poNumber_item: { poNumber: data.poNumber, item: data.item } },
        update: data,
        create: data,
      })

      if (existing) updated++
      else created++
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return Response.json({
    totalRows: rows.length,
    created,
    updated,
    skipped,
    errors: errors.slice(0, 20),
    errorCount: errors.length,
  })
}
