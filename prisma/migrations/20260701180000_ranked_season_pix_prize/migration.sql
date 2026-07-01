-- AlterEnum
ALTER TYPE "RankedSeasonRewardType" ADD VALUE 'PIX';

-- AlterTable
ALTER TABLE "RankedSeasonPrize" ADD COLUMN "pixAmountCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RankedSeasonPrizeGrant" ADD COLUMN "pixAmountCents" INTEGER NOT NULL DEFAULT 0;
