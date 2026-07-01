-- Multiple prizes per position (top 3 can each have coins + skin + agent + sticker, etc.)

ALTER TABLE "RankedSeasonPrize" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "RankedSeasonPrize_seasonId_position_key";

CREATE INDEX "RankedSeasonPrize_seasonId_position_idx" ON "RankedSeasonPrize"("seasonId", "position");

-- Backfill grant prizeId before changing uniqueness
UPDATE "RankedSeasonPrizeGrant" g
SET "prizeId" = p.id
FROM "RankedSeasonPrize" p
WHERE g."seasonId" = p."seasonId"
  AND g."position" = p."position"
  AND (g."prizeId" IS NULL OR g."prizeId" = '');

DELETE FROM "RankedSeasonPrizeGrant" WHERE "prizeId" IS NULL OR "prizeId" = '';

ALTER TABLE "RankedSeasonPrizeGrant" ALTER COLUMN "prizeId" SET NOT NULL;

DROP INDEX IF EXISTS "RankedSeasonPrizeGrant_seasonId_userId_position_key";

CREATE UNIQUE INDEX "RankedSeasonPrizeGrant_seasonId_userId_prizeId_key"
  ON "RankedSeasonPrizeGrant"("seasonId", "userId", "prizeId");
