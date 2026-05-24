-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Organization" ADD COLUMN "subscription" TEXT NOT NULL DEFAULT 'FREE';
