-- Missions + achievements (additive only; safe for shared DB)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MissionPeriod') THEN
    CREATE TYPE "MissionPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MissionMetric') THEN
    CREATE TYPE "MissionMetric" AS ENUM ('MATCHES_PLAYED', 'MATCHES_WON', 'KILLS', 'ASSISTS', 'MVPS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AchievementMetric') THEN
    CREATE TYPE "AchievementMetric" AS ENUM ('TOTAL_MATCHES', 'TOTAL_WINS', 'TOTAL_KILLS', 'TOTAL_ASSISTS', 'TOTAL_MVPS', 'LEVEL', 'LIFETIME_COINS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AchievementTier') THEN
    CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "MissionDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "period" "MissionPeriod" NOT NULL,
    "metric" "MissionMetric" NOT NULL,
    "target" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MissionDefinition_code_key" ON "MissionDefinition"("code");
CREATE INDEX IF NOT EXISTS "MissionDefinition_period_enabled_idx" ON "MissionDefinition"("period", "enabled");

CREATE TABLE IF NOT EXISTS "UserMission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserMission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserMission_userId_missionId_periodKey_key" ON "UserMission"("userId", "missionId", "periodKey");
CREATE INDEX IF NOT EXISTS "UserMission_userId_periodKey_idx" ON "UserMission"("userId", "periodKey");

CREATE TABLE IF NOT EXISTS "AchievementDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "metric" "AchievementMetric" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "tier" "AchievementTier" NOT NULL DEFAULT 'BRONZE',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AchievementDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AchievementDefinition_code_key" ON "AchievementDefinition"("code");
CREATE INDEX IF NOT EXISTS "AchievementDefinition_metric_enabled_idx" ON "AchievementDefinition"("metric", "enabled");

CREATE TABLE IF NOT EXISTS "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
CREATE INDEX IF NOT EXISTS "UserAchievement_userId_idx" ON "UserAchievement"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserMission_userId_fkey') THEN
    ALTER TABLE "UserMission" ADD CONSTRAINT "UserMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserMission_missionId_fkey') THEN
    ALTER TABLE "UserMission" ADD CONSTRAINT "UserMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MissionDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAchievement_userId_fkey') THEN
    ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAchievement_achievementId_fkey') THEN
    ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "AchievementDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
