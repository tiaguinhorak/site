import "server-only";

import type { CsgoStickerCatalog } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  lookupStickerFromApi,
  listAllStickersFromApi,
  type StickerCatalogRowFromApi,
} from "@/lib/inventory/csgo-api-sticker-index";
import {
  normalizeStickerImageUrl,
  stickerHasDisplayImage,
} from "@/lib/inventory/sticker-image-url";
import {
  getStickerWeaponCompatibility,
  isCs2OnlySticker,
  isLegacyCompatibleSticker,
  LEGACY_MAX_STICKER_DEFINDEX,
  stickerCompatibilityMeta,
  type StickerWeaponCompatibilityReason,
} from "@/lib/inventory/sticker-weapon-compatibility";
import {
  parseStickerFinishVariant,
  stickerMatchesFinishFilter,
  type StickerFinishVariant,
} from "@/lib/inventory/sticker-finish-variant";

export type StickerCatalogAdminRow = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  stickerType: string | null;
  effect: string | null;
  tournament: string | null;
  enabled: boolean;
  source: string;
  updatedAt: string;
};

function serializeRow(row: CsgoStickerCatalog): StickerCatalogAdminRow {
  return {
    id: row.id,
    defIndex: row.defIndex,
    name: row.name,
    imageUrl: normalizeStickerImageUrl(row.imageUrl),
    rarity: row.rarity,
    stickerType: row.stickerType,
    effect: row.effect,
    tournament: row.tournament,
    enabled: row.enabled,
    source: row.source,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function lookupStickerCatalogPreview(defIndex: number) {
  const fromApi = await lookupStickerFromApi(defIndex);
  const existing = await prisma.csgoStickerCatalog.findUnique({
    where: { defIndex },
  });
  return {
    found: fromApi !== null,
    api: fromApi,
    existing: existing ? serializeRow(existing) : null,
  };
}

function stickerHasImage(imageUrl: string | null | undefined): boolean {
  return stickerHasDisplayImage(imageUrl);
}

async function upsertStickerRow(
  input: {
    defIndex: number;
    source: string;
    enabled?: boolean;
    id?: string;
  },
  apiRow: StickerCatalogRowFromApi | null,
) {
  const existing = await prisma.csgoStickerCatalog.findUnique({
    where: { defIndex: input.defIndex },
  });

  const imageUrl = normalizeStickerImageUrl(apiRow?.imageUrl ?? existing?.imageUrl ?? null);
  const meta = stickerCompatibilityMeta({
    defIndex: input.defIndex,
    effect: apiRow?.effect ?? existing?.effect,
    tournament: apiRow?.tournament ?? existing?.tournament,
    stickerType: apiRow?.stickerType ?? existing?.stickerType,
  });
  const legacyCompatible = isLegacyCompatibleSticker(meta);
  const canEnable = stickerHasImage(imageUrl) && legacyCompatible;

  const data = {
    defIndex: input.defIndex,
    name: apiRow?.name ?? existing?.name ?? `Sticker ${input.defIndex}`,
    imageUrl,
    rarity: apiRow?.rarity ?? existing?.rarity ?? "comum",
    stickerType: apiRow?.stickerType ?? existing?.stickerType ?? null,
    effect: apiRow?.effect ?? existing?.effect ?? null,
    tournament: apiRow?.tournament ?? existing?.tournament ?? null,
    enabled: canEnable ? (input.enabled ?? existing?.enabled ?? true) : false,
    source: existing?.source && existing.source !== "sync" ? existing.source : input.source,
  };

  const id = existing?.id ?? input.id ?? apiRow?.id ?? `sticker-${input.defIndex}`;

  const row = await prisma.csgoStickerCatalog.upsert({
    where: { id },
    create: { id, ...data, source: input.source, enabled: input.enabled ?? true },
    update: data,
  });

  return serializeRow(row);
}

export async function upsertStickerByDefIndex(defIndex: number, enabled = true) {
  const apiRow = await lookupStickerFromApi(defIndex);
  if (!apiRow) {
    throw new Error("Sticker não encontrado na CSGO-API. Confira o def_index.");
  }
  if (!stickerHasImage(apiRow.imageUrl)) {
    throw new Error("Sticker sem imagem na CSGO-API — não pode ser habilitado.");
  }
  if (isCs2OnlySticker(stickerCompatibilityMeta(apiRow))) {
    throw new Error("Sticker do CS2 — não disponível no CS:GO Legacy.");
  }
  return upsertStickerRow({ defIndex, source: "admin", enabled }, apiRow);
}

export async function importAllStickersFromApi(options?: { enabled?: boolean }) {
  const apiRows = await listAllStickersFromApi();
  let imported = 0;
  for (const apiRow of apiRows) {
    if (!apiRow.imageUrl?.trim()) {
      continue;
    }
    await upsertStickerRow(
      {
        defIndex: apiRow.defIndex,
        source: "import",
        enabled: options?.enabled ?? true,
        id: apiRow.id,
      },
      apiRow,
    );
    imported += 1;
  }
  await disableStickersWithoutImages();
  const disabledCs2 = await disableCs2StickersInCatalog();
  return { imported, disabledCs2 };
}

export async function disableCs2StickersInCatalog(): Promise<number> {
  let disabled = 0;

  const byDefIndex = await prisma.csgoStickerCatalog.updateMany({
    where: {
      enabled: true,
      defIndex: { gt: LEGACY_MAX_STICKER_DEFINDEX },
    },
    data: { enabled: false },
  });
  disabled += byDefIndex.count;

  const byEffect = await prisma.csgoStickerCatalog.updateMany({
    where: {
      enabled: true,
      effect: { in: ["Lenticular", "Embroidered"] },
    },
    data: { enabled: false },
  });
  disabled += byEffect.count;

  for (const pattern of ["Austin 2025", "Budapest 2025", "CS2 Major"]) {
    const byTournament = await prisma.csgoStickerCatalog.updateMany({
      where: {
        enabled: true,
        tournament: { contains: pattern, mode: "insensitive" },
      },
      data: { enabled: false },
    });
    disabled += byTournament.count;
  }

  return disabled;
}

let legacyStickerPurgeDone = false;

/** One-time per process: disable CS2 catalog rows and scrub saved player slots. */
export async function ensureLegacyStickerCatalogAndLoadouts(): Promise<void> {
  if (legacyStickerPurgeDone) return;
  legacyStickerPurgeDone = true;
  await disableCs2StickersInCatalog();
  const { purgeCs2StickerSlotsFromAllPlayers } = await import(
    "@/lib/inventory/player-weapon-stickers"
  );
  await purgeCs2StickerSlotsFromAllPlayers();
}

export async function disableStickersWithoutImages(): Promise<number> {
  const result = await prisma.csgoStickerCatalog.updateMany({
    where: {
      OR: [{ imageUrl: null }, { imageUrl: "" }],
    },
    data: { enabled: false },
  });
  return result.count;
}

export async function listStickerCatalogAdmin(options: {
  page?: number;
  limit?: number;
  search?: string;
  enabledOnly?: boolean;
}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 40));
  const search = options.search?.trim() ?? "";

  const where = {
    ...(options.enabledOnly ? { enabled: true } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { tournament: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.csgoStickerCatalog.count({ where }),
    prisma.csgoStickerCatalog.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: rows.map(serializeRow),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function updateStickerCatalogAdmin(
  id: string,
  data: { enabled?: boolean; imageUrl?: string | null },
) {
  const row = await prisma.csgoStickerCatalog.update({
    where: { id },
    data,
  });
  return serializeRow(row);
}

export async function deleteStickerCatalogAdmin(id: string) {
  await prisma.csgoStickerCatalog.delete({ where: { id } });
  return { ok: true };
}

export type StickerPickerItem = StickerCatalogAdminRow & {
  compatible: boolean;
  incompatibleReason: StickerWeaponCompatibilityReason | null;
  finishVariant: StickerFinishVariant;
};

function enrichPickerItem(
  row: StickerCatalogAdminRow,
  weaponId?: string,
): StickerPickerItem {
  const finishVariant = parseStickerFinishVariant(row.name, row.effect);
  if (!weaponId?.trim()) {
    return {
      ...row,
      compatible: true,
      incompatibleReason: null,
      finishVariant,
    };
  }

  const compat = getStickerWeaponCompatibility(
    {
      defIndex: row.defIndex,
      effect: row.effect,
      tournament: row.tournament,
      stickerType: row.stickerType,
      name: row.name,
    },
    weaponId,
  );

  return {
    ...row,
    compatible: compat.compatible,
    incompatibleReason: compat.compatible ? null : compat.reason,
    finishVariant,
  };
}

function legacyPickerWhere(search?: string) {
  return {
    enabled: true,
    imageUrl: { not: null },
    defIndex: { lte: LEGACY_MAX_STICKER_DEFINDEX },
    NOT: {
      OR: [
        { effect: { in: ["Lenticular", "Embroidered"] } },
        { tournament: { contains: "Austin 2025", mode: "insensitive" as const } },
        { tournament: { contains: "Budapest 2025", mode: "insensitive" as const } },
        { tournament: { contains: "CS2 Major", mode: "insensitive" as const } },
      ],
    },
    ...(search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {}),
  };
}

export async function listEnabledStickersForPicker(options?: {
  search?: string;
  page?: number;
  limit?: number;
  weaponId?: string;
  finishVariant?: StickerFinishVariant | "";
}) {
  await ensureLegacyStickerCatalogAndLoadouts();

  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(48, Math.max(1, options?.limit ?? 24));
  const trimmed = options?.search?.trim() ?? "";
  const weaponId = options?.weaponId?.trim() ?? "";
  const finishFilter = options?.finishVariant ?? "";
  const where = legacyPickerWhere(trimmed || undefined);

  const rows = await prisma.csgoStickerCatalog.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const withImage = rows.filter((row) => stickerHasImage(row.imageUrl));
  let items = withImage
    .map((row) => enrichPickerItem(serializeRow(row), weaponId))
    .filter((row) => stickerMatchesFinishFilter(row.name, row.effect, finishFilter));

  if (weaponId) {
    items = items.filter((row) => row.compatible);
  }

  const total = items.length;
  const pageItems = items.slice((page - 1) * limit, page * limit);

  return {
    items: pageItems,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
