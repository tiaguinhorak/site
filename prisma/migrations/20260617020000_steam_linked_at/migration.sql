-- AlterTable
ALTER TABLE "User" ADD COLUMN "steamLinkedAt" DATETIME;

-- Backfill vinculações existentes
UPDATE "User" SET "steamLinkedAt" = "updatedAt" WHERE "steamId" IS NOT NULL AND "steamLinkedAt" IS NULL;
