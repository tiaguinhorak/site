-- Ranked competitive stats on User
ALTER TABLE "User" ADD COLUMN "rankedWins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "rankedLosses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "rankedKills" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "rankedDeaths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "competitivePoints" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "User_competitivePoints_idx" ON "User"("competitivePoints");

-- Match result fields on ranked session
ALTER TABLE "RankedMatchSession" ADD COLUMN "scoreTeamA" INTEGER;
ALTER TABLE "RankedMatchSession" ADD COLUMN "scoreTeamB" INTEGER;
ALTER TABLE "RankedMatchSession" ADD COLUMN "winnerTeam" TEXT;
ALTER TABLE "RankedMatchSession" ADD COLUMN "liveStartedAt" TIMESTAMP(3);
ALTER TABLE "RankedMatchSession" ADD COLUMN "matchFinishedAt" TIMESTAMP(3);
ALTER TABLE "RankedMatchSession" ADD COLUMN "durationSec" INTEGER;
ALTER TABLE "RankedMatchSession" ADD COLUMN "resultSyncedAt" TIMESTAMP(3);

-- Per-player stats for a ranked match
CREATE TABLE "RankedMatchPlayerStat" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "steamId" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "mvp" INTEGER NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedMatchPlayerStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RankedMatchPlayerStat_sessionId_steamId_key" ON "RankedMatchPlayerStat"("sessionId", "steamId");
CREATE INDEX "RankedMatchPlayerStat_sessionId_idx" ON "RankedMatchPlayerStat"("sessionId");
CREATE INDEX "RankedMatchPlayerStat_userId_idx" ON "RankedMatchPlayerStat"("userId");
CREATE INDEX "RankedMatchPlayerStat_steamId_idx" ON "RankedMatchPlayerStat"("steamId");

ALTER TABLE "RankedMatchPlayerStat" ADD CONSTRAINT "RankedMatchPlayerStat_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RankedMatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankedMatchPlayerStat" ADD CONSTRAINT "RankedMatchPlayerStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
