-- CreateEnum
CREATE TYPE "AvatarModerationStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');
CREATE TYPE "AvatarMediaType" AS ENUM ('STATIC', 'GIF');
CREATE TYPE "SmurfStatus" AS ENUM ('CLEAR', 'REVIEW', 'FLAGGED', 'CONFIRMED');
CREATE TYPE "SmurfSignalType" AS ENUM ('NEW_STEAM_ACCOUNT', 'LOW_STEAM_AGE', 'SHARED_IP', 'STAT_ANOMALY', 'STEAM_RELINK', 'RAPID_RANK_CLIMB');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "profileBannerUrl" TEXT,
ADD COLUMN "profileBackgroundId" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN "profileFrameId" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "profileAccentColor" TEXT,
ADD COLUMN "profileThemeId" TEXT NOT NULL DEFAULT 'aurora',
ADD COLUMN "profileBorderId" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "profileShowPlanBadge" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "profileShowAchievements" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "avatarModerationStatus" "AvatarModerationStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "avatarMediaType" "AvatarMediaType" NOT NULL DEFAULT 'STATIC',
ADD COLUMN "steamAccountCreatedAt" TIMESTAMP(3),
ADD COLUMN "rankedSmurfHoldUntil" TIMESTAMP(3),
ADD COLUMN "smurfRiskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "smurfStatus" "SmurfStatus" NOT NULL DEFAULT 'CLEAR';

-- CreateTable
CREATE TABLE "SmurfSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signalType" "SmurfSignalType" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmurfSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountFingerprint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgentHash" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmurfSignal_userId_resolved_idx" ON "SmurfSignal"("userId", "resolved");
CREATE INDEX "SmurfSignal_signalType_createdAt_idx" ON "SmurfSignal"("signalType", "createdAt");
CREATE INDEX "AccountFingerprint_ipHash_idx" ON "AccountFingerprint"("ipHash");
CREATE INDEX "AccountFingerprint_userAgentHash_idx" ON "AccountFingerprint"("userAgentHash");
CREATE UNIQUE INDEX "AccountFingerprint_userId_ipHash_userAgentHash_key" ON "AccountFingerprint"("userId", "ipHash", "userAgentHash");
CREATE INDEX "User_smurfStatus_idx" ON "User"("smurfStatus");
CREATE INDEX "User_smurfRiskScore_idx" ON "User"("smurfRiskScore");
CREATE INDEX "User_avatarModerationStatus_idx" ON "User"("avatarModerationStatus");

-- AddForeignKey
ALTER TABLE "SmurfSignal" ADD CONSTRAINT "SmurfSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountFingerprint" ADD CONSTRAINT "AccountFingerprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
