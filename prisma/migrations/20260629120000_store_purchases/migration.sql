-- CreateEnum
CREATE TYPE "StoreProductKind" AS ENUM ('SKIN', 'PACKAGE', 'CASE', 'AGENT');

-- CreateEnum
CREATE TYPE "StoreRewardKind" AS ENUM ('CATALOG_SKIN', 'AGENT');

-- CreateEnum
CREATE TYPE "StorePurchaseStatus" AS ENUM ('COMPLETED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "StoreItem" ADD COLUMN     "productKind" "StoreProductKind" NOT NULL DEFAULT 'SKIN',
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxPerUser" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "StoreItemReward" (
    "id" TEXT NOT NULL,
    "storeItemId" TEXT NOT NULL,
    "kind" "StoreRewardKind" NOT NULL,
    "catalogSkinId" TEXT,
    "agentDefIndex" INTEGER,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreItemReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeItemId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "status" "StorePurchaseStatus" NOT NULL DEFAULT 'COMPLETED',
    "grantedRewards" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreItem_enabled_sortOrder_idx" ON "StoreItem"("enabled", "sortOrder");

-- CreateIndex
CREATE INDEX "StoreItemReward_storeItemId_idx" ON "StoreItemReward"("storeItemId");

-- CreateIndex
CREATE INDEX "StoreItemReward_catalogSkinId_idx" ON "StoreItemReward"("catalogSkinId");

-- CreateIndex
CREATE INDEX "StorePurchase_userId_idx" ON "StorePurchase"("userId");

-- CreateIndex
CREATE INDEX "StorePurchase_storeItemId_idx" ON "StorePurchase"("storeItemId");

-- CreateIndex
CREATE INDEX "StorePurchase_userId_storeItemId_idx" ON "StorePurchase"("userId", "storeItemId");

-- AddForeignKey
ALTER TABLE "StoreItemReward" ADD CONSTRAINT "StoreItemReward_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "StoreItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItemReward" ADD CONSTRAINT "StoreItemReward_catalogSkinId_fkey" FOREIGN KEY ("catalogSkinId") REFERENCES "CsgoSkinCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePurchase" ADD CONSTRAINT "StorePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePurchase" ADD CONSTRAINT "StorePurchase_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "StoreItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
