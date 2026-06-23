-- Admin-driven catalog: enabled flag, source, unique weapon+paintkit
ALTER TABLE "CsgoSkinCatalog" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CsgoSkinCatalog" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'sync';
ALTER TABLE "CsgoSkinCatalog" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CsgoSkinCatalog" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "CsgoSkinCatalog_weaponId_paintkit_key" ON "CsgoSkinCatalog"("weaponId", "paintkit");
CREATE INDEX "CsgoSkinCatalog_enabled_idx" ON "CsgoSkinCatalog"("enabled");
