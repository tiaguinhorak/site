-- CreateEnum
CREATE TYPE "ClanJoinMode" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "ClanJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "CoinPackCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'DELINQUENT');

-- AlterEnum
ALTER TYPE "CoinTransactionKind" ADD VALUE IF NOT EXISTS 'COIN_TOPUP';

-- AlterTable
ALTER TABLE "Clan" ADD COLUMN IF NOT EXISTS "joinMode" "ClanJoinMode" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "ClanJoinRequest" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ClanJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClanJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoinPackCheckout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "status" "CoinPackCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinPackCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClanJoinRequest_clanId_userId_key" ON "ClanJoinRequest"("clanId", "userId");
CREATE INDEX "ClanJoinRequest_clanId_status_idx" ON "ClanJoinRequest"("clanId", "status");
CREATE INDEX "ClanJoinRequest_userId_idx" ON "ClanJoinRequest"("userId");
CREATE INDEX "CoinPackCheckout_userId_status_idx" ON "CoinPackCheckout"("userId", "status");

-- AddForeignKey
ALTER TABLE "ClanJoinRequest" ADD CONSTRAINT "ClanJoinRequest_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanJoinRequest" ADD CONSTRAINT "ClanJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoinPackCheckout" ADD CONSTRAINT "CoinPackCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
