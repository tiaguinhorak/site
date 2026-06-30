-- AlterTable
ALTER TABLE "StoreItem" ADD COLUMN "coinShopOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "StoreItem_coinShopOnly_enabled_sortOrder_idx" ON "StoreItem"("coinShopOnly", "enabled", "sortOrder");
