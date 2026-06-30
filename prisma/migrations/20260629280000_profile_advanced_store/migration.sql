-- Advanced profile aggregates, store product kinds, favorites JSON (additive only)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StoreProductKind' AND e.enumlabel = 'TAG') THEN
    ALTER TYPE "StoreProductKind" ADD VALUE 'TAG';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StoreProductKind' AND e.enumlabel = 'MEDAL') THEN
    ALTER TYPE "StoreProductKind" ADD VALUE 'MEDAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'StoreProductKind' AND e.enumlabel = 'SUBSCRIPTION') THEN
    ALTER TYPE "StoreProductKind" ADD VALUE 'SUBSCRIPTION';
  END IF;
END$$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedClutches" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedUtilityDamage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedEnemiesFlashed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedAwpKills" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileTag" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileMedalCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mapPlayCounts" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "weaponKillCounts" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "User_rankedClutches_idx" ON "User"("rankedClutches");
CREATE INDEX IF NOT EXISTS "User_rankedUtilityDamage_idx" ON "User"("rankedUtilityDamage");
CREATE INDEX IF NOT EXISTS "User_rankedAwpKills_idx" ON "User"("rankedAwpKills");

ALTER TABLE "RankedMatchPlayerStat" ADD COLUMN IF NOT EXISTS "awpKills" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StoreItem" ADD COLUMN IF NOT EXISTS "tagText" TEXT;
ALTER TABLE "StoreItem" ADD COLUMN IF NOT EXISTS "medalCode" TEXT;
ALTER TABLE "StoreItem" ADD COLUMN IF NOT EXISTS "grantPlan" "Plan";

-- Backfill clutches from historical match stats
UPDATE "User" u
SET "rankedClutches" = COALESCE(s.total_clutches, 0)
FROM (
  SELECT "userId", SUM("clutchesWon") AS total_clutches
  FROM "RankedMatchPlayerStat"
  WHERE "userId" IS NOT NULL
  GROUP BY "userId"
) s
WHERE u."id" = s."userId";

UPDATE "User" u
SET "rankedUtilityDamage" = COALESCE(s.total_util, 0)
FROM (
  SELECT "userId", SUM("utilityDamage") AS total_util
  FROM "RankedMatchPlayerStat"
  WHERE "userId" IS NOT NULL
  GROUP BY "userId"
) s
WHERE u."id" = s."userId";

UPDATE "User" u
SET "rankedEnemiesFlashed" = COALESCE(s.total_flash, 0)
FROM (
  SELECT "userId", SUM("enemiesFlashed") AS total_flash
  FROM "RankedMatchPlayerStat"
  WHERE "userId" IS NOT NULL
  GROUP BY "userId"
) s
WHERE u."id" = s."userId";
