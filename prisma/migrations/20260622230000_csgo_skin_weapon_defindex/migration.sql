-- CS:GO item definition index (gloves group, etc.) from CSGO-API weapon.weapon_id
ALTER TABLE "CsgoSkinCatalog" ADD COLUMN IF NOT EXISTS "weaponDefIndex" INTEGER;
