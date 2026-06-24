import "server-only";

import { prisma } from "@/lib/prisma";
import { weaponIdToItemDefIndex } from "@/lib/inventory/weapon-defindex";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { normalizeWeaponId } from "@/lib/inventory/loadout-team";
import { steamIdForGamePlugin } from "@/lib/steam/steam-id";
import {
  lookupStickerFromApi,
  type StickerCatalogRowFromApi,
} from "@/lib/inventory/csgo-api-sticker-index";

export type WeaponStickerSlots = {
  slots: number[];
  wears: number[];
};

export type WeaponStickerSlotDetail = {
  slot: number;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

export type WeaponStickerSlotsEnriched = WeaponStickerSlots & {
  slotDetails: WeaponStickerSlotDetail[];
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
): Promise<WeaponStickerSlotsEnriched> {
  const normalizedWeaponId = normalizeWeaponId(weaponId);

  const row = await prisma.csgoPlayerWeaponSticker.findFirst({
    where: {
      steamId,
      team,
      OR: [{ weaponId: normalizedWeaponId }, { weaponId: weaponId.trim() }],
    },
  });

  const slots = row
    ? [row.slot0, row.slot1, row.slot2, row.slot3, row.slot4]
    : [];
  const { slots: normalizedSlots, wears } = normalizeSlots(slots);

  const defIndices = normalizedSlots.filter((defIndex) => defIndex > 0);
  const catalogStickers =
    defIndices.length > 0
      ? await prisma.csgoStickerCatalog.findMany({
          where: { defIndex: { in: defIndices } },
        })
      : [];
  const catalogByDef = new Map(catalogStickers.map((entry) => [entry.defIndex, entry]));

  const apiFallbacks = new Map<number, StickerCatalogRowFromApi>();
  for (const defIndex of defIndices) {
    if (catalogByDef.has(defIndex)) continue;
    const apiRow = await lookupStickerFromApi(defIndex);
    if (apiRow) apiFallbacks.set(defIndex, apiRow);
  }

  const slotDetails: WeaponStickerSlotDetail[] = normalizedSlots.map((defIndex, slot) => {
    if (defIndex <= 0) {
      return { slot, defIndex: 0, name: "", imageUrl: null };
    }
    const catalog = catalogByDef.get(defIndex);
    const api = apiFallbacks.get(defIndex);
    return {
      slot,
      defIndex,
      name: catalog?.name ?? api?.name ?? `Sticker ${defIndex}`,
      imageUrl: catalog?.imageUrl ?? api?.imageUrl ?? null,
    };
  });

  return { slots: normalizedSlots, wears, slotDetails };
}

export async function savePlayerWeaponStickers(
  steamId: string,
  weaponId: string,
  team: LoadoutTeam,
  slots: number[],
) {
  const normalizedWeaponId = normalizeWeaponId(weaponId);
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
    where: {
      steamId_weaponId_team: { steamId, weaponId: normalizedWeaponId, team },
    },
    create: {
      steamId,
      weaponId: normalizedWeaponId,
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

  return { weaponId: normalizedWeaponId, team, slots: normalized };
}

export type StickerSyncEntry = {
  weaponIndex: number;
  slots: number[];
  wears: number[];
};

export async function getAllPlayerStickersForSync(): Promise<
  Array<{ steamId: string; entries: StickerSyncEntry[] }>
> {
  const rows = await prisma.csgoPlayerWeaponSticker.findMany();

  const bySteam = new Map<string, typeof rows>();

  for (const row of rows) {
    const list = bySteam.get(row.steamId) ?? [];
    list.push(row);
    bySteam.set(row.steamId, list);
  }

  const result: Array<{ steamId: string; entries: StickerSyncEntry[] }> = [];

  for (const [steamId64, playerRows] of bySteam.entries()) {
    const entries: StickerSyncEntry[] = [];

    for (const row of playerRows) {
      const weaponIndex = await weaponIdToItemDefIndex(row.weaponId);
      if (!weaponIndex) continue;

      entries.push({
        weaponIndex,
        slots: [row.slot0, row.slot1, row.slot2, row.slot3, row.slot4],
        wears: [row.wear0, row.wear1, row.wear2, row.wear3, row.wear4],
      });
    }

    result.push({
      steamId: steamIdForGamePlugin(steamId64),
      entries,
    });
  }

  return result;
}

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
