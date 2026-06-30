-- AlterEnum
ALTER TYPE "StoreRewardKind" ADD VALUE 'STICKER';

-- AlterTable
ALTER TABLE "StoreItemReward" ADD COLUMN "stickerDefIndex" INTEGER;

-- CreateIndex
CREATE INDEX "StoreItemReward_stickerDefIndex_idx" ON "StoreItemReward"("stickerDefIndex");
