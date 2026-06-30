-- Add aggregate rankedMvps to User for MVP category leaderboard.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedMvps" INTEGER NOT NULL DEFAULT 0;

-- Indexes to support category leaderboard sorting.
CREATE INDEX IF NOT EXISTS "User_rankedKills_idx" ON "User"("rankedKills");
CREATE INDEX IF NOT EXISTS "User_rankedAssists_idx" ON "User"("rankedAssists");
CREATE INDEX IF NOT EXISTS "User_rankedMvps_idx" ON "User"("rankedMvps");

-- Backfill rankedMvps from historical ranked match stats.
UPDATE "User" u
SET "rankedMvps" = COALESCE(s.total_mvps, 0)
FROM (
  SELECT "userId", SUM("mvp") AS total_mvps
  FROM "RankedMatchPlayerStat"
  WHERE "userId" IS NOT NULL
  GROUP BY "userId"
) s
WHERE u."id" = s."userId";
