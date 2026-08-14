CREATE TABLE "InterruptTask" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "personId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "projectId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterruptTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InterruptTask_personId_idx" ON "InterruptTask"("personId");
CREATE INDEX "InterruptTask_date_idx" ON "InterruptTask"("date");

ALTER TABLE "InterruptTask" ADD CONSTRAINT "InterruptTask_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InterruptTask" ADD CONSTRAINT "InterruptTask_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
