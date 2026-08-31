import { prisma } from "@/lib/prisma"
import { WikiClient } from "./WikiClient"

export const metadata = { title: "Wiki — Nexus Hub" }
export const dynamic = "force-dynamic"

export default async function WikiPage() {
  const topics = await prisma.wikiTopic.findMany({
    include: {
      entries: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })

  return <WikiClient initialTopics={topics} />
}
