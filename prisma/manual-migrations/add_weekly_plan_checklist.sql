CREATE TABLE "WeekPlanChecklistItem" (
    "id" TEXT NOT NULL,
    "planItemId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekPlanChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeekPlanChecklistItem_planItemId_idx" ON "WeekPlanChecklistItem"("planItemId");

ALTER TABLE "WeekPlanChecklistItem" ADD CONSTRAINT "WeekPlanChecklistItem_planItemId_fkey"
    FOREIGN KEY ("planItemId") REFERENCES "WeekPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
