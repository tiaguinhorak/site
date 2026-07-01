-- CreateEnum
CREATE TYPE "RankedSeasonPixPayoutStatus" AS ENUM ('PENDING', 'READY', 'CONTACTED', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "pixKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "pixKeyHolderName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "RankedSeasonPrizeGrant" ADD COLUMN "pixPayoutStatus" "RankedSeasonPixPayoutStatus";
ALTER TABLE "RankedSeasonPrizeGrant" ADD COLUMN "pixPayoutNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RankedSeasonPrizeGrant" ADD COLUMN "pixContactedAt" TIMESTAMP(3);
ALTER TABLE "RankedSeasonPrizeGrant" ADD COLUMN "pixPaidAt" TIMESTAMP(3);

-- Backfill existing Pix grants
UPDATE "RankedSeasonPrizeGrant" g
SET "pixPayoutStatus" = CASE
  WHEN u."pixKey" <> '' THEN 'READY'::"RankedSeasonPixPayoutStatus"
  ELSE 'PENDING'::"RankedSeasonPixPayoutStatus"
END
FROM "User" u
WHERE g."rewardType" = 'PIX' AND g."userId" = u.id AND g."pixPayoutStatus" IS NULL;

CREATE INDEX "RankedSeasonPrizeGrant_pixPayoutStatus_idx" ON "RankedSeasonPrizeGrant"("pixPayoutStatus");
