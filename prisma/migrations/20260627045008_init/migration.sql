-- CreateEnum
CREATE TYPE "PortfolioGroup" AS ENUM ('Focus', 'NewProduct', 'RevampPlan', 'ExitPlan');

-- CreateEnum
CREATE TYPE "RagStatus" AS ENUM ('green', 'amber', 'red');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('ideation', 'alignment', 'prd_signoff', 'development', 'testing', 'uat', 'production', 'completed');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('ProjectManager', 'TechLead', 'Developer', 'QAEngineer', 'UIUXDesigner', 'BusinessAnalyst', 'Stakeholder', 'ProductOwner', 'DevOps', 'Consultant');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('draft', 'reviewing', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "department" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "portfolioGroup" "PortfolioGroup" NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "ragStatus" "RagStatus" NOT NULL DEFAULT 'green',
    "phase" "Phase" NOT NULL DEFAULT 'ideation',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "nextMilestone" TEXT NOT NULL DEFAULT '',
    "nextMilestoneDate" TIMESTAMP(3),
    "isDelayed" BOOLEAN NOT NULL DEFAULT false,
    "delayDays" INTEGER,
    "budgetTotal" DOUBLE PRECISION,
    "budgetUsed" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'THB',
    "needsDecision" BOOLEAN NOT NULL DEFAULT false,
    "decisionNote" TEXT,
    "client" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stakeholders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prdUrl" TEXT,
    "designPrototypeUrl" TEXT,
    "prdContent" TEXT DEFAULT '',
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL,
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "allocationPercent" INTEGER,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GanttMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "phase" "Phase" NOT NULL,

    CONSTRAINT "GanttMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "status" "IdeaStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blocker" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blocker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "likelihood" "Severity" NOT NULL,
    "impact" "Severity" NOT NULL,
    "mitigation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NextStep" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_personId_key" ON "ProjectMember"("projectId", "personId");

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanttMilestone" ADD CONSTRAINT "GanttMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaItem" ADD CONSTRAINT "IdeaItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blocker" ADD CONSTRAINT "Blocker_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextStep" ADD CONSTRAINT "NextStep_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
