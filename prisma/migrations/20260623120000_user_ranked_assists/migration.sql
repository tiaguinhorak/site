-- Add ranked assists aggregate on User (from ranked match stats)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedAssists" INTEGER NOT NULL DEFAULT 0;
