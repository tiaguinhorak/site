-- Battle pass (additive only; safe for shared DB)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BattlePassTrack') THEN
    CREATE TYPE "BattlePassTrack" AS ENUM ('FREE', 'PREMIUM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BattlePassRewardType') THEN
    CREATE TYPE "BattlePassRewardType" AS ENUM ('COINS', 'SKIN', 'AGENT', 'STICKER');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "BattlePassSeason" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL DEFAULT 50,
    "xpPerLevel" INTEGER NOT NULL DEFAULT 1000,
    "premiumCostCoins" INTEGER NOT NULL DEFAULT 5000,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BattlePassSeason_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BattlePassSeason_code_key" ON "BattlePassSeason"("code");
CREATE INDEX IF NOT EXISTS "BattlePassSeason_active_idx" ON "BattlePassSeason"("active");

CREATE TABLE IF NOT EXISTS "BattlePassReward" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "track" "BattlePassTrack" NOT NULL,
    "rewardType" "BattlePassRewardType" NOT NULL,
    "amountCoins" INTEGER NOT NULL DEFAULT 0,
    "catalogSkinId" TEXT,
    "agentDefIndex" INTEGER,
    "stickerDefIndex" INTEGER,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BattlePassReward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BattlePassReward_seasonId_level_track_key" ON "BattlePassReward"("seasonId", "level", "track");
CREATE INDEX IF NOT EXISTS "BattlePassReward_seasonId_idx" ON "BattlePassReward"("seasonId");

CREATE TABLE IF NOT EXISTS "UserBattlePass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBattlePass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserBattlePass_userId_seasonId_key" ON "UserBattlePass"("userId", "seasonId");
CREATE INDEX IF NOT EXISTS "UserBattlePass_seasonId_idx" ON "UserBattlePass"("seasonId");

CREATE TABLE IF NOT EXISTS "UserBattlePassClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBattlePassClaim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserBattlePassClaim_userId_rewardId_key" ON "UserBattlePassClaim"("userId", "rewardId");
CREATE INDEX IF NOT EXISTS "UserBattlePassClaim_userId_idx" ON "UserBattlePassClaim"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BattlePassReward_seasonId_fkey') THEN
    ALTER TABLE "BattlePassReward" ADD CONSTRAINT "BattlePassReward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "BattlePassSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserBattlePass_userId_fkey') THEN
    ALTER TABLE "UserBattlePass" ADD CONSTRAINT "UserBattlePass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserBattlePass_seasonId_fkey') THEN
    ALTER TABLE "UserBattlePass" ADD CONSTRAINT "UserBattlePass_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "BattlePassSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserBattlePassClaim_userId_fkey') THEN
    ALTER TABLE "UserBattlePassClaim" ADD CONSTRAINT "UserBattlePassClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserBattlePassClaim_rewardId_fkey') THEN
    ALTER TABLE "UserBattlePassClaim" ADD CONSTRAINT "UserBattlePassClaim_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "BattlePassReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
