CREATE INDEX IF NOT EXISTS "CsgoSkinCatalog_category_idx" ON "CsgoSkinCatalog"("category");
CREATE INDEX IF NOT EXISTS "CsgoSkinCatalog_category_weaponName_idx" ON "CsgoSkinCatalog"("category", "weaponName");
