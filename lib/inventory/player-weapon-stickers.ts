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
import { normalizeStickerImageUrl } from "@/lib/inventory/sticker-image-url";
import {
  clampStickerSlotsToWeapon,
  STICKER_SLOT_STORAGE_COUNT,
  weaponSupportsStickersById,
} from "@/lib/inventory/weapon-sticker-slot-limits";
import { getStickerWeaponCompatibility, isLegacyCompatibleSticker } from "@/lib/inventory/sticker-weapon-compatibility";
import { weaponIdToDisplayName } from "@/lib/inventory/weapon-display-name";
import {
  getInventoryPlanLimits,
} from "@/lib/inventory/plan-inventory-access";

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

const SLOT_COUNT = STICKER_SLOT_STORAGE_COUNT;

function normalizeSlots(slots: number[]): WeaponStickerSlots {
  const normalized = slots.slice(0, SLOT_COUNT).map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0));
  while (normalized.length < SLOT_COUNT) normalized.push(0);
  const wears = Array.from({ length: SLOT_COUNT }, () => 0);
  return { slots: normalized, wears };
}

function zeroIncompatibleStickerSlots(slots: number[], weaponId: string): number[] {
  return slots.map((defIndex) => {
    if (defIndex <= 0) return 0;
    if (!isLegacyCompatibleSticker({ defIndex })) return 0;
    const compat = getStickerWeaponCompatibility({ defIndex }, weaponId);
    return compat.compatible ? defIndex : 0;
  });
}

async function zeroIncompatibleStickerSlotsWithCatalog(
  slots: number[],
  weaponId: string,
): Promise<number[]> {
  const defIndices = slots.filter((defIndex) => defIndex > 0);
  const catalogRows =
    defIndices.length > 0
      ? await prisma.csgoStickerCatalog.findMany({
          where: { defIndex: { in: defIndices } },
        })
      : [];
  const catalogByDef = new Map(catalogRows.map((row) => [row.defIndex, row]));

  return slots.map((defIndex) => {
    if (defIndex <= 0) return 0;
    const catalog = catalogByDef.get(defIndex);
    const compat = getStickerWeaponCompatibility(
      {
        defIndex,
        effect: catalog?.effect,
        tournament: catalog?.tournament,
        stickerType: catalog?.stickerType,
      },
      weaponId,
    );
    return compat.compatible ? defIndex : 0;
  });
}

function sanitizeStickerSlotsForWeapon(
  slots: number[],
  weaponId: string,
  planMax: number,
  defIndex?: number | null,
): number[] {
  return zeroIncompatibleStickerSlots(
    clampStickerSlotsToWeapon(slots, weaponId, planMax, defIndex),
    weaponId,
  );
}

export async function getPlayerWeaponStickers(
  steamId: string,
  weaponId: string,
  team: LoadoutTeam,
  options?: { planMax?: number },
): Promise<WeaponStickerSlotsEnriched> {
  const normalizedWeaponId = normalizeWeaponId(weaponId);
  const defIndex = await weaponIdToItemDefIndex(normalizedWeaponId);
  const planMax = options?.planMax ?? STICKER_SLOT_STORAGE_COUNT;

  const row = await prisma.csgoPlayerWeaponSticker.findFirst({
    where: {
      steamId,
      team,
      OR: [{ weaponId: normalizedWeaponId }, { weaponId: weaponId.trim() }],
    },
  });

  const slots = row
    ? [row.slot0, row.slot1, row.slot2, row.slot3]
    : [];
  const clamped = clampStickerSlotsToWeapon(
    slots,
    normalizedWeaponId,
    planMax,
    defIndex,
  );
  const sanitized = await zeroIncompatibleStickerSlotsWithCatalog(
    clamped,
    normalizedWeaponId,
  );
  const { slots: normalizedSlots, wears } = normalizeSlots(sanitized);

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
      imageUrl: normalizeStickerImageUrl(catalog?.imageUrl ?? api?.imageUrl ?? null),
    };
  });

  return { slots: normalizedSlots, wears, slotDetails };
}

export async function savePlayerWeaponStickers(
  userId: string,
  steamId: string,
  weaponId: string,
  team: LoadoutTeam,
  slots: number[],
) {
  const limits = await getInventoryPlanLimits(userId);
  if (!limits.canUseStickers) {
    throw new Error("Stickers disponíveis nos planos Premium e Elite.");
  }

  const normalizedWeaponId = normalizeWeaponId(weaponId);
  const defIndex = await weaponIdToItemDefIndex(normalizedWeaponId);
  const { slots: normalized, wears } = normalizeSlots(
    sanitizeStickerSlotsForWeapon(slots, normalizedWeaponId, limits.maxStickerSlots, defIndex),
  );

  const weaponDisplayName = weaponIdToDisplayName(normalizedWeaponId);

  // Only allow enabled catalog stickers (0 = empty slot).
  for (const stickerDefIndex of normalized) {
    if (stickerDefIndex <= 0) continue;
    const sticker = await prisma.csgoStickerCatalog.findFirst({
      where: { defIndex: stickerDefIndex, enabled: true, imageUrl: { not: null } },
    });
    if (!sticker || !sticker.imageUrl?.trim()) {
      throw new Error(
        `Sticker def_index ${stickerDefIndex} não está disponível (sem imagem no catálogo).`,
      );
    }

    const compat = getStickerWeaponCompatibility(
      {
        defIndex: stickerDefIndex,
        effect: sticker.effect,
        tournament: sticker.tournament,
        stickerType: sticker.stickerType,
      },
      normalizedWeaponId,
    );
    if (!compat.compatible) {
      if (compat.reason === "legacy_cs2_only") {
        throw new Error(
          `O sticker "${sticker.name}" é do CS2 e não funciona no CS:GO Legacy (não use na ${weaponDisplayName}).`,
        );
      }
      throw new Error(
        `O sticker "${sticker.name}" não pode ser aplicado na ${weaponDisplayName}.`,
      );
    }
  }

  const allEmpty = normalized.every((slot) => slot <= 0);

  if (allEmpty) {
    await prisma.csgoPlayerWeaponSticker.deleteMany({
      where: { steamId, weaponId: normalizedWeaponId, team },
    });
  } else {
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
        slot4: 0,
        wear0: wears[0],
        wear1: wears[1],
        wear2: wears[2],
        wear3: wears[3],
        wear4: 0,
      },
      update: {
        slot0: normalized[0],
        slot1: normalized[1],
        slot2: normalized[2],
        slot3: normalized[3],
        slot4: 0,
        wear0: wears[0],
        wear1: wears[1],
        wear2: wears[2],
        wear3: wears[3],
        wear4: 0,
      },
    });
  }

  return { weaponId: normalizedWeaponId, team, slots: normalized };
}

export type StickerSyncEntry = {
  weaponIndex: number;
  team: "T" | "CT";
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
      if (!weaponSupportsStickersById(row.weaponId)) continue;

      const weaponIndex = await weaponIdToItemDefIndex(row.weaponId);
      if (!weaponIndex) continue;

      const rawSlots = [row.slot0, row.slot1, row.slot2, row.slot3];
      const slots = zeroIncompatibleStickerSlots(
        clampStickerSlotsToWeapon(
          rawSlots,
          row.weaponId,
          STICKER_SLOT_STORAGE_COUNT,
          weaponIndex,
        ),
        row.weaponId,
      );

      entries.push({
        weaponIndex,
        team: row.team as LoadoutTeam,
        slots,
        wears: [row.wear0, row.wear1, row.wear2, row.wear3],
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
    if (!weaponSupportsStickersById(row.weaponId)) continue;

    const weaponIndex = await weaponIdToItemDefIndex(row.weaponId);
    if (!weaponIndex) continue;

    const slots = zeroIncompatibleStickerSlots(
      clampStickerSlotsToWeapon(
        [row.slot0, row.slot1, row.slot2, row.slot3],
        row.weaponId,
        STICKER_SLOT_STORAGE_COUNT,
        weaponIndex,
      ),
      row.weaponId,
    );

    entries.push({
      weaponIndex,
      team: row.team as LoadoutTeam,
      slots,
      wears: [row.wear0, row.wear1, row.wear2, row.wear3],
    });
  }

  return {
    steamId: steamIdForGamePlugin(steamId64),
    entries,
  };
}
