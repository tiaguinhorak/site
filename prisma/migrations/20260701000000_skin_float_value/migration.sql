-- Continuous wear (float) for equipped skins. 0.0 = Factory New / max quality.
ALTER TABLE "CsgoPlayerSkin" ADD COLUMN IF NOT EXISTS "floatValue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill floatValue from the legacy wear enum so existing loadouts keep their look.
UPDATE "CsgoPlayerSkin" SET "floatValue" = CASE "wear"
  WHEN 'factory_new'    THEN 0.03
  WHEN 'minimal_wear'   THEN 0.11
  WHEN 'field_tested'   THEN 0.24
  WHEN 'well_worn'      THEN 0.41
  WHEN 'battle_scarred' THEN 0.60
  ELSE 0.03
END
WHERE "floatValue" = 0;
