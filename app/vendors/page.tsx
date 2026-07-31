import { prisma } from "@/lib/prisma"
import { VendorsClient } from "./VendorsClient"

export const metadata = { title: "Vendors — Zenith Hub" }
export const dynamic = "force-dynamic"

export default async function VendorsPage() {
  const orders = await prisma.vendorOrder.findMany({
    orderBy: { docDate: "asc" },
  })

  return <VendorsClient orders={orders as any} />
}
