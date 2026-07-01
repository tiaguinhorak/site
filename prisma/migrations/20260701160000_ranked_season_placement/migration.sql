-- CreateTable
CREATE TABLE "UserRankedSeasonPlacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "previousSeasonId" TEXT,
    "previousPosition" INTEGER,
    "previousElo" INTEGER,
    "previousKd" DOUBLE PRECISION,
    "previousPoints" INTEGER,
    "previousWins" INTEGER,
    "previousKills" INTEGER,
    "totalPreviousParticipants" INTEGER NOT NULL DEFAULT 0,
    "placementApplied" BOOLEAN NOT NULL DEFAULT false,
    "seededElo" INTEGER,
    "seededPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRankedSeasonPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRankedSeasonPlacement_userId_seasonId_key" ON "UserRankedSeasonPlacement"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "UserRankedSeasonPlacement_seasonId_idx" ON "UserRankedSeasonPlacement"("seasonId");

-- CreateIndex
CREATE INDEX "UserRankedSeasonPlacement_userId_idx" ON "UserRankedSeasonPlacement"("userId");

-- AddForeignKey
ALTER TABLE "UserRankedSeasonPlacement" ADD CONSTRAINT "UserRankedSeasonPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankedSeasonPlacement" ADD CONSTRAINT "UserRankedSeasonPlacement_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankedSeasonPlacement" ADD CONSTRAINT "UserRankedSeasonPlacement_previousSeasonId_fkey" FOREIGN KEY ("previousSeasonId") REFERENCES "RankedSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
