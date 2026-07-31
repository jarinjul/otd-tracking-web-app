import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const { Pool } = pg

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma
}
