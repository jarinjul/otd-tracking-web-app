CREATE TABLE "MonthlySnapshot" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlySnapshot_month_key" ON "MonthlySnapshot"("month");
