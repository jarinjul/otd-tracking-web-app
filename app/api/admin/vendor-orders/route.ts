import { prisma } from "@/lib/prisma"

export async function GET() {
  const orders = await prisma.vendorOrder.findMany({
    orderBy: [{ vendorName: "asc" }, { docDate: "desc" }],
  })
  return Response.json(orders)
}
