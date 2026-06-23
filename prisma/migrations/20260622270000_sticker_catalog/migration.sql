-- Sticker catalog + per-weapon player sticker loadouts (CT/TR)
CREATE TABLE "CsgoStickerCatalog" (
  "id" TEXT NOT NULL,
  "defIndex" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "imageUrl" TEXT,
  "rarity" TEXT NOT NULL,
  "stickerType" TEXT,
  "effect" TEXT,
  "tournament" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "source" TEXT NOT NULL DEFAULT 'import',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CsgoStickerCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CsgoStickerCatalog_defIndex_key" ON "CsgoStickerCatalog"("defIndex");
CREATE INDEX "CsgoStickerCatalog_enabled_idx" ON "CsgoStickerCatalog"("enabled");

CREATE TABLE "CsgoPlayerWeaponSticker" (
  "id" TEXT NOT NULL,
  "steamId" TEXT NOT NULL,
  "weaponId" TEXT NOT NULL,
  "team" TEXT NOT NULL,
  "slot0" INTEGER NOT NULL DEFAULT 0,
  "slot1" INTEGER NOT NULL DEFAULT 0,
  "slot2" INTEGER NOT NULL DEFAULT 0,
  "slot3" INTEGER NOT NULL DEFAULT 0,
  "slot4" INTEGER NOT NULL DEFAULT 0,
  "wear0" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wear1" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wear2" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wear3" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wear4" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CsgoPlayerWeaponSticker_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CsgoPlayerWeaponSticker_steam_weapon_team_key"
  ON "CsgoPlayerWeaponSticker"("steamId", "weaponId", "team");
CREATE INDEX "CsgoPlayerWeaponSticker_steamId_idx" ON "CsgoPlayerWeaponSticker"("steamId");
