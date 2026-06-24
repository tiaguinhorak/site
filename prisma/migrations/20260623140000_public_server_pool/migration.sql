-- AlterTable
ALTER TABLE "PublicServer" ADD COLUMN "pool" TEXT NOT NULL DEFAULT 'public';

-- CreateIndex
CREATE INDEX "PublicServer_isLiveSynced_pool_idx" ON "PublicServer"("isLiveSynced", "pool");
