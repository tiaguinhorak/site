-- Pix LGPD fields + VAR AC review cases

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pixKeyType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pixContactEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pixContactPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pixLgpdConsentedAt" TIMESTAMP(3);

CREATE TYPE "AnticheatReviewStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'CLEARED', 'CONFIRMED', 'DISMISSED');

CREATE TABLE "AnticheatReviewCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "steamId" TEXT NOT NULL DEFAULT '',
    "nickname" TEXT NOT NULL DEFAULT '',
    "matchId" TEXT,
    "demoUrl" TEXT,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "severity" INTEGER NOT NULL DEFAULT 2,
    "status" "AnticheatReviewStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT NOT NULL DEFAULT '',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnticheatReviewCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnticheatReviewCase_status_idx" ON "AnticheatReviewCase"("status");
CREATE INDEX "AnticheatReviewCase_steamId_idx" ON "AnticheatReviewCase"("steamId");
CREATE INDEX "AnticheatReviewCase_createdAt_idx" ON "AnticheatReviewCase"("createdAt");

ALTER TABLE "AnticheatReviewCase" ADD CONSTRAINT "AnticheatReviewCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnticheatReviewCase" ADD CONSTRAINT "AnticheatReviewCase_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
