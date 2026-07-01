-- Ranked season management (admin temporadas, reset, top-3 prizes)

CREATE TYPE "RankedSeasonStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'ARCHIVED');
CREATE TYPE "RankedSeasonRewardType" AS ENUM ('COINS', 'CATALOG_SKIN', 'AGENT', 'STICKER');

ALTER TYPE "CoinTransactionKind" ADD VALUE IF NOT EXISTS 'EARN_SEASON_PRIZE';

CREATE TABLE "RankedSeason" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "resetAt" TIMESTAMP(3),
    "status" "RankedSeasonStatus" NOT NULL DEFAULT 'DRAFT',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedSeason_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RankedSeasonPrize" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "rewardType" "RankedSeasonRewardType" NOT NULL,
    "amountCoins" INTEGER NOT NULL DEFAULT 0,
    "catalogSkinId" TEXT,
    "agentDefIndex" INTEGER,
    "stickerDefIndex" INTEGER,
    "label" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedSeasonPrize_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RankedSeasonStanding" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "elo" INTEGER NOT NULL,
    "competitivePoints" INTEGER NOT NULL,
    "rankedWins" INTEGER NOT NULL,
    "rankedLosses" INTEGER NOT NULL,
    "rankedKills" INTEGER NOT NULL,
    "rankedDeaths" INTEGER NOT NULL,
    "kd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedSeasonStanding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RankedSeasonPrizeGrant" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prizeId" TEXT,
    "rewardType" "RankedSeasonRewardType" NOT NULL,
    "amountCoins" INTEGER NOT NULL DEFAULT 0,
    "catalogSkinId" TEXT,
    "agentDefIndex" INTEGER,
    "stickerDefIndex" INTEGER,
    "label" TEXT NOT NULL DEFAULT '',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedByAdminId" TEXT,

    CONSTRAINT "RankedSeasonPrizeGrant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RankedMatchSession" ADD COLUMN "seasonId" TEXT;

CREATE UNIQUE INDEX "RankedSeason_code_key" ON "RankedSeason"("code");
CREATE INDEX "RankedSeason_active_idx" ON "RankedSeason"("active");
CREATE INDEX "RankedSeason_status_idx" ON "RankedSeason"("status");
CREATE INDEX "RankedSeason_seasonNumber_idx" ON "RankedSeason"("seasonNumber");
CREATE INDEX "RankedSeason_startsAt_idx" ON "RankedSeason"("startsAt");

CREATE UNIQUE INDEX "RankedSeasonPrize_seasonId_position_key" ON "RankedSeasonPrize"("seasonId", "position");
CREATE INDEX "RankedSeasonPrize_seasonId_idx" ON "RankedSeasonPrize"("seasonId");

CREATE UNIQUE INDEX "RankedSeasonStanding_seasonId_userId_key" ON "RankedSeasonStanding"("seasonId", "userId");
CREATE INDEX "RankedSeasonStanding_seasonId_position_idx" ON "RankedSeasonStanding"("seasonId", "position");
CREATE INDEX "RankedSeasonStanding_userId_idx" ON "RankedSeasonStanding"("userId");

CREATE UNIQUE INDEX "RankedSeasonPrizeGrant_seasonId_userId_position_key" ON "RankedSeasonPrizeGrant"("seasonId", "userId", "position");
CREATE INDEX "RankedSeasonPrizeGrant_seasonId_idx" ON "RankedSeasonPrizeGrant"("seasonId");
CREATE INDEX "RankedSeasonPrizeGrant_userId_idx" ON "RankedSeasonPrizeGrant"("userId");

CREATE INDEX "RankedMatchSession_seasonId_idx" ON "RankedMatchSession"("seasonId");

ALTER TABLE "RankedSeasonPrize" ADD CONSTRAINT "RankedSeasonPrize_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankedSeasonPrize" ADD CONSTRAINT "RankedSeasonPrize_catalogSkinId_fkey" FOREIGN KEY ("catalogSkinId") REFERENCES "CsgoSkinCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RankedSeasonStanding" ADD CONSTRAINT "RankedSeasonStanding_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankedSeasonStanding" ADD CONSTRAINT "RankedSeasonStanding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RankedSeasonPrizeGrant" ADD CONSTRAINT "RankedSeasonPrizeGrant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankedSeasonPrizeGrant" ADD CONSTRAINT "RankedSeasonPrizeGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed Season 1 as active (matches current hardcoded marketing copy)
INSERT INTO "RankedSeason" (
    "id", "code", "name", "seasonNumber", "description",
    "startsAt", "status", "active", "updatedAt"
) VALUES (
    'season-1-default',
    'season-1',
    'Season 1',
    1,
    'Primeira temporada oficial do ranking rankeado.',
    CURRENT_TIMESTAMP,
    'ACTIVE',
    true,
    CURRENT_TIMESTAMP
);

-- Default top-3 prize slots (disabled until admin configures)
INSERT INTO "RankedSeasonPrize" ("id", "seasonId", "position", "rewardType", "label", "enabled", "updatedAt")
VALUES
    ('season-1-prize-1', 'season-1-default', 1, 'COINS', '1º lugar', false, CURRENT_TIMESTAMP),
    ('season-1-prize-2', 'season-1-default', 2, 'COINS', '2º lugar', false, CURRENT_TIMESTAMP),
    ('season-1-prize-3', 'season-1-default', 3, 'COINS', '3º lugar', false, CURRENT_TIMESTAMP);
