-- AlterTable
ALTER TABLE "CsgoSkinCatalog" ADD COLUMN "gameClient" TEXT NOT NULL DEFAULT 'unknown';

-- CreateIndex
CREATE INDEX "CsgoSkinCatalog_gameClient_idx" ON "CsgoSkinCatalog"("gameClient");
