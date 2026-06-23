-- Split equipped loadout by terrorist / counter-terrorist side
ALTER TABLE "CsgoPlayerSkin" ADD COLUMN "equippedT" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CsgoPlayerSkin" ADD COLUMN "equippedCT" BOOLEAN NOT NULL DEFAULT false;

-- Existing global equip → both sides (backward compatible)
UPDATE "CsgoPlayerSkin" SET "equippedT" = true, "equippedCT" = true WHERE "equipped" = true;

CREATE INDEX "CsgoPlayerSkin_steamId_equippedT_idx" ON "CsgoPlayerSkin"("steamId", "equippedT");
CREATE INDEX "CsgoPlayerSkin_steamId_equippedCT_idx" ON "CsgoPlayerSkin"("steamId", "equippedCT");
