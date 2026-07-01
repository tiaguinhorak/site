-- Legacy skins were created as field_tested; default is now Factory New (max quality).
-- Only reset rows that still use the old default (seed 0, never customized pattern).
UPDATE "CsgoPlayerSkin"
SET "floatValue" = 0,
    "wear" = 'factory_new'
WHERE "seed" = 0
  AND (
    "wear" <> 'factory_new'
    OR "floatValue" > 0.0001
  );
