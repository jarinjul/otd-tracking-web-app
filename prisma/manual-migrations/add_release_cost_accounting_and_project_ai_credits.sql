-- Admin data-entry additions:
--   Release: 4 free-text SAP cost-accounting codes on the create/edit form
--   Project: repeatable AI-credit line items ({ modelsAi, costModel }) for development
-- Matches prisma/schema.prisma. No backup needed — additive nullable columns / JSON default.
-- Run: psql "$DATABASE_URL" -f prisma/manual-migrations/add_release_cost_accounting_and_project_ai_credits.sql

ALTER TABLE "Release" ADD COLUMN "workforce" TEXT;
ALTER TABLE "Release" ADD COLUMN "costCenter" TEXT;
ALTER TABLE "Release" ADD COLUMN "costElement" TEXT;
ALTER TABLE "Release" ADD COLUMN "ioNumber" TEXT;

ALTER TABLE "Project" ADD COLUMN "aiCredits" JSONB NOT NULL DEFAULT '[]';
