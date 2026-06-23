import "server-only";

import { prisma } from "@/lib/prisma";
import { weaponIdToItemDefIndex } from "@/lib/inventory/weapon-defindex";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { steamIdForGamePlugin } from "@/lib/steam/steam-id";

export type WeaponStickerSlots = {
  slots: number[];
  wears: number[];
};

export type PlayerWeaponStickerRow = {
  weaponId: string;
  team: LoadoutTeam;
  slots: number[];
  wears: number[];
};

const SLOT_COUNT = 5;

function normalizeSlots(slots: number[]): WeaponStickerSlots {
  const normalized = slots.slice(0, SLOT_COUNT).map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0));
  while (normalized.length < SLOT_COUNT) normalized.push(0);
  const wears = Array.from({ length: SLOT_COUNT }, () => 0);
  return { slots: normalized, wears };
}

export async function getPlayerWeaponStickers(
  steamId: string,
  weaponId: string,
  team: LoadoutTeam,
): Promise<WeaponStickerSlots> {
  const row = await prisma.csgoPlayerWeaponSticker.findUnique({
    where: {
      steamId_weaponId_team: { steamId, weaponId, team },
    },
  });

  if (!row) {
    return normalizeSlots([]);
  }

  return {
    slots: [row.slot0, row.slot1, row.slot2, row.slot3, row.slot4],
    wears: [row.wear0, row.wear1, row.wear2, row.wear3, row.wear4],
  };
}

export async function savePlayerWeaponStickers(
  steamId: string,
  weaponId: string,
  team: LoadoutTeam,
  slots: number[],
) {
  const { slots: normalized, wears } = normalizeSlots(slots);

  // Only allow enabled catalog stickers (0 = empty slot).
  for (const defIndex of normalized) {
    if (defIndex <= 0) continue;
    const sticker = await prisma.csgoStickerCatalog.findFirst({
      where: { defIndex, enabled: true },
    });
    if (!sticker) {
      throw new Error(`Sticker def_index ${defIndex} não está habilitado no catálogo.`);
    }
  }

  await prisma.csgoPlayerWeaponSticker.upsert({
    where: { steamId_weaponId_team: { steamId, weaponId, team } },
    create: {
      steamId,
      weaponId,
      team,
      slot0: normalized[0],
      slot1: normalized[1],
      slot2: normalized[2],
      slot3: normalized[3],
      slot4: normalized[4],
      wear0: wears[0],
      wear1: wears[1],
      wear2: wears[2],
      wear3: wears[3],
      wear4: wears[4],
    },
    update: {
      slot0: normalized[0],
      slot1: normalized[1],
      slot2: normalized[2],
      slot3: normalized[3],
      slot4: normalized[4],
      wear0: wears[0],
      wear1: wears[1],
      wear2: wears[2],
      wear3: wears[3],
      wear4: wears[4],
    },
  });

  return { weaponId, team, slots: normalized };
}

export type StickerSyncEntry = {
  weaponIndex: number;
  slots: number[];
  wears: number[];
};

export async function getPlayerStickersForSync(steamId64: string): Promise<{
  steamId: string;
  entries: StickerSyncEntry[];
}> {
  const rows = await prisma.csgoPlayerWeaponSticker.findMany({
    where: { steamId: steamId64 },
  });

  const entries: StickerSyncEntry[] = [];

  for (const row of rows) {
    const weaponIndex = await weaponIdToItemDefIndex(row.weaponId);
    if (!weaponIndex) continue;

    const slots = [row.slot0, row.slot1, row.slot2, row.slot3, row.slot4];

    entries.push({
      weaponIndex,
      slots,
      wears: [row.wear0, row.wear1, row.wear2, row.wear3, row.wear4],
    });
  }

  return {
    steamId: steamIdForGamePlugin(steamId64),
    entries,
  };
}
