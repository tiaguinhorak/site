-- Link web inventory items to CS:GO skin catalog + optional preview images
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "catalogSkinId" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "CsgoSkinCatalog" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE INDEX IF NOT EXISTS "InventoryItem_catalogSkinId_idx" ON "InventoryItem"("catalogSkinId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_catalogSkinId_fkey'
  ) THEN
    ALTER TABLE "InventoryItem"
      ADD CONSTRAINT "InventoryItem_catalogSkinId_fkey"
      FOREIGN KEY ("catalogSkinId") REFERENCES "CsgoSkinCatalog"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
