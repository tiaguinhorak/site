-- Advanced match stats, rounds, highlights and death heatmap.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchHighlightType') THEN
    CREATE TYPE "MatchHighlightType" AS ENUM ('ACE', 'CLUTCH', 'MULTI_KILL', 'HEADSHOTS', 'ENTRY', 'KNIFE');
  END IF;
END$$;

-- User lifetime aggregates.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedHeadshots" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedDamage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedRoundsPlayed" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "User_rankedHeadshots_idx" ON "User"("rankedHeadshots");

-- Per-player advanced fields.
ALTER TABLE "RankedMatchPlayerStat" ADD COLUMN IF NOT EXISTS "headshots" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RankedMatchPlayerStat" ADD COLUMN IF NOT EXISTS "damage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RankedMatchPlayerStat" ADD COLUMN IF NOT EXISTS "utilityDamage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RankedMatchPlayerStat" ADD COLUMN IF NOT EXISTS "enemiesFlashed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RankedMatchPlayerStat" ADD COLUMN IF NOT EXISTS "clutchesWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RankedMatchPlayerStat" ADD COLUMN IF NOT EXISTS "entryKills" INTEGER NOT NULL DEFAULT 0;

-- Session demo (replay) link.
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "demoUrl" TEXT;

CREATE TABLE IF NOT EXISTS "RankedMatchRound" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "winnerTeam" TEXT,
  "reason" TEXT,
  "bombPlanted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedMatchRound_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RankedMatchRound_sessionId_roundNumber_key"
  ON "RankedMatchRound"("sessionId", "roundNumber");
CREATE INDEX IF NOT EXISTS "RankedMatchRound_sessionId_idx" ON "RankedMatchRound"("sessionId");

CREATE TABLE IF NOT EXISTS "RankedMatchHighlight" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "steamId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "MatchHighlightType" NOT NULL,
  "roundNumber" INTEGER,
  "detail" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedMatchHighlight_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RankedMatchHighlight_sessionId_idx" ON "RankedMatchHighlight"("sessionId");
CREATE INDEX IF NOT EXISTS "RankedMatchHighlight_userId_idx" ON "RankedMatchHighlight"("userId");

CREATE TABLE IF NOT EXISTS "RankedMatchDeath" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL DEFAULT 0,
  "victimSteamId" TEXT NOT NULL,
  "killerSteamId" TEXT,
  "weapon" TEXT,
  "headshot" BOOLEAN NOT NULL DEFAULT false,
  "victimTeam" TEXT,
  "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "z" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedMatchDeath_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RankedMatchDeath_sessionId_idx" ON "RankedMatchDeath"("sessionId");
CREATE INDEX IF NOT EXISTS "RankedMatchDeath_sessionId_roundNumber_idx"
  ON "RankedMatchDeath"("sessionId", "roundNumber");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchRound_sessionId_fkey') THEN
    ALTER TABLE "RankedMatchRound" ADD CONSTRAINT "RankedMatchRound_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "RankedMatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchHighlight_sessionId_fkey') THEN
    ALTER TABLE "RankedMatchHighlight" ADD CONSTRAINT "RankedMatchHighlight_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "RankedMatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchDeath_sessionId_fkey') THEN
    ALTER TABLE "RankedMatchDeath" ADD CONSTRAINT "RankedMatchDeath_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "RankedMatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
