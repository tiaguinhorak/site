import "server-only";

import type { CsgoStickerCatalog } from "@/lib/generated/prisma/client";
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
import { getStickerWeaponCompatibility } from "@/lib/inventory/sticker-weapon-compatibility";
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

type StickerCatalogLite = Pick<
  CsgoStickerCatalog,
  "defIndex" | "effect" | "tournament" | "stickerType"
>;

function stickerMetaFromCatalog(
  defIndex: number,
  catalog?: StickerCatalogLite | null,
): { defIndex: number; effect?: string | null; tournament?: string | null; stickerType?: string | null } {
  if (!catalog) return { defIndex };
  return {
    defIndex,
    effect: catalog.effect,
    tournament: catalog.tournament,
    stickerType: catalog.stickerType,
  };
}

function sanitizeStickerSlotsWithCatalogMap(
  slots: number[],
  weaponId: string,
  catalogByDef: Map<number, StickerCatalogLite>,
): number[] {
  return slots.map((defIndex) => {
    if (defIndex <= 0) return 0;
    const catalog = catalogByDef.get(defIndex);
    const compat = getStickerWeaponCompatibility(
      stickerMetaFromCatalog(defIndex, catalog),
      weaponId,
    );
    return compat.compatible ? defIndex : 0;
  });
}

async function fetchCatalogMapForDefIndices(
  defIndices: number[],
): Promise<Map<number, StickerCatalogLite>> {
  const unique = [...new Set(defIndices.filter((defIndex) => defIndex > 0))];
  if (unique.length === 0) return new Map();
  const catalogRows = await prisma.csgoStickerCatalog.findMany({
    where: { defIndex: { in: unique } },
  });
  const map = new Map<number, StickerCatalogLite>(
    catalogRows.map((row) => [row.defIndex, row]),
  );

  for (const defIndex of unique) {
    if (map.has(defIndex)) continue;
    const apiRow = await lookupStickerFromApi(defIndex);
    if (!apiRow) continue;
    map.set(defIndex, {
      defIndex,
      effect: apiRow.effect,
      tournament: apiRow.tournament,
      stickerType: apiRow.stickerType,
    });
  }

  return map;
}

function slotsDiffer(raw: number[], sanitized: number[]): boolean {
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    if ((raw[i] ?? 0) !== (sanitized[i] ?? 0)) return true;
  }
  return false;
}

async function persistSanitizedStickerSlots(
  steamId: string,
  weaponId: string,
  team: LoadoutTeam,
  sanitized: number[],
  wears: number[],
  allEmpty: boolean,
): Promise<void> {
  if (allEmpty) {
    await prisma.csgoPlayerWeaponSticker.deleteMany({
      where: { steamId, weaponId, team },
    });
    return;
  }
  await prisma.csgoPlayerWeaponSticker.upsert({
    where: {
      steamId_weaponId_team: { steamId, weaponId, team },
    },
    create: {
      steamId,
      weaponId,
      team,
      slot0: sanitized[0],
      slot1: sanitized[1],
      slot2: sanitized[2],
      slot3: sanitized[3],
      slot4: 0,
      wear0: wears[0],
      wear1: wears[1],
      wear2: wears[2],
      wear3: wears[3],
      wear4: 0,
    },
    update: {
      slot0: sanitized[0],
      slot1: sanitized[1],
      slot2: sanitized[2],
      slot3: sanitized[3],
      slot4: 0,
      wear0: wears[0],
      wear1: wears[1],
      wear2: wears[2],
      wear3: wears[3],
      wear4: 0,
    },
  });
}

/** Zeros CS2 / incompatible sticker slots in all saved loadouts (DB cleanup). */
export async function purgeCs2StickerSlotsFromAllPlayers(): Promise<number> {
  const rows = await prisma.csgoPlayerWeaponSticker.findMany();
  const allDefs = new Set<number>();
  for (const row of rows) {
    for (const defIndex of [row.slot0, row.slot1, row.slot2, row.slot3]) {
      if (defIndex > 0) allDefs.add(defIndex);
    }
  }
  const catalogByDef = await fetchCatalogMapForDefIndices([...allDefs]);
  let updated = 0;

  for (const row of rows) {
    const weaponIndex = await weaponIdToItemDefIndex(row.weaponId);
    const rawSlots = [row.slot0, row.slot1, row.slot2, row.slot3];
    const clamped = clampStickerSlotsToWeapon(
      rawSlots,
      row.weaponId,
      STICKER_SLOT_STORAGE_COUNT,
      weaponIndex,
    );
    const sanitized = sanitizeStickerSlotsWithCatalogMap(
      clamped,
      row.weaponId,
      catalogByDef,
    );
    if (!slotsDiffer(rawSlots, sanitized)) continue;

    const { slots: normalizedSlots, wears } = normalizeSlots(sanitized);
    const allEmpty = normalizedSlots.every((defIndex) => defIndex <= 0);
    await persistSanitizedStickerSlots(
      row.steamId,
      row.weaponId,
      row.team as LoadoutTeam,
      normalizedSlots,
      wears,
      allEmpty,
    );
    updated += 1;
  }

  return updated;
}

async function sanitizeStickerSlotsForWeaponWithCatalog(
  slots: number[],
  weaponId: string,
  planMax: number,
  defIndex?: number | null,
): Promise<number[]> {
  const clamped = clampStickerSlotsToWeapon(slots, weaponId, planMax, defIndex);
  const catalogByDef = await fetchCatalogMapForDefIndices(clamped);
  return sanitizeStickerSlotsWithCatalogMap(clamped, weaponId, catalogByDef);
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

  const rawSlots = row
    ? [row.slot0, row.slot1, row.slot2, row.slot3]
    : [];
  const clamped = clampStickerSlotsToWeapon(
    rawSlots,
    normalizedWeaponId,
    planMax,
    defIndex,
  );
  const catalogByDef = await fetchCatalogMapForDefIndices(clamped);
  const sanitized = sanitizeStickerSlotsWithCatalogMap(
    clamped,
    normalizedWeaponId,
    catalogByDef,
  );
  const { slots: normalizedSlots, wears } = normalizeSlots(sanitized);

  if (row && slotsDiffer(rawSlots, normalizedSlots)) {
    const allEmpty = normalizedSlots.every((slotDefIndex) => slotDefIndex <= 0);
    await persistSanitizedStickerSlots(
      steamId,
      normalizedWeaponId,
      team,
      normalizedSlots,
      wears,
      allEmpty,
    );
  }

  const defIndices = normalizedSlots.filter((defIndex) => defIndex > 0);
  const catalogStickers =
    defIndices.length > 0
      ? await prisma.csgoStickerCatalog.findMany({
          where: { defIndex: { in: defIndices } },
        })
      : [];
  const catalogDetailsByDef = new Map(catalogStickers.map((entry) => [entry.defIndex, entry]));

  const apiFallbacks = new Map<number, StickerCatalogRowFromApi>();
  for (const defIndex of defIndices) {
    if (catalogDetailsByDef.has(defIndex)) continue;
    const apiRow = await lookupStickerFromApi(defIndex);
    if (apiRow) apiFallbacks.set(defIndex, apiRow);
  }

  const slotDetails: WeaponStickerSlotDetail[] = normalizedSlots.map((defIndex, slot) => {
    if (defIndex <= 0) {
      return { slot, defIndex: 0, name: "", imageUrl: null };
    }
    const catalog = catalogDetailsByDef.get(defIndex);
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
    await sanitizeStickerSlotsForWeaponWithCatalog(
      slots,
      normalizedWeaponId,
      limits.maxStickerSlots,
      defIndex,
    ),
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
  const allDefs = new Set<number>();
  for (const row of rows) {
    for (const defIndex of [row.slot0, row.slot1, row.slot2, row.slot3]) {
      if (defIndex > 0) allDefs.add(defIndex);
    }
  }
  const catalogByDef = await fetchCatalogMapForDefIndices([...allDefs]);

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
      const slots = sanitizeStickerSlotsWithCatalogMap(
        clampStickerSlotsToWeapon(
          rawSlots,
          row.weaponId,
          STICKER_SLOT_STORAGE_COUNT,
          weaponIndex,
        ),
        row.weaponId,
        catalogByDef,
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
  const allDefs = new Set<number>();
  for (const row of rows) {
    for (const defIndex of [row.slot0, row.slot1, row.slot2, row.slot3]) {
      if (defIndex > 0) allDefs.add(defIndex);
    }
  }
  const catalogByDef = await fetchCatalogMapForDefIndices([...allDefs]);

  const entries: StickerSyncEntry[] = [];

  for (const row of rows) {
    if (!weaponSupportsStickersById(row.weaponId)) continue;

    const weaponIndex = await weaponIdToItemDefIndex(row.weaponId);
    if (!weaponIndex) continue;

    const slots = sanitizeStickerSlotsWithCatalogMap(
      clampStickerSlotsToWeapon(
        [row.slot0, row.slot1, row.slot2, row.slot3],
        row.weaponId,
        STICKER_SLOT_STORAGE_COUNT,
        weaponIndex,
      ),
      row.weaponId,
      catalogByDef,
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
