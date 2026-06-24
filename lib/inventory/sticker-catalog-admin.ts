import "server-only";

import type { CsgoStickerCatalog } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  lookupStickerFromApi,
  listAllStickersFromApi,
  type StickerCatalogRowFromApi,
} from "@/lib/inventory/csgo-api-sticker-index";

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
    imageUrl: row.imageUrl,
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

  const data = {
    defIndex: input.defIndex,
    name: apiRow?.name ?? existing?.name ?? `Sticker ${input.defIndex}`,
    imageUrl: apiRow?.imageUrl ?? existing?.imageUrl ?? null,
    rarity: apiRow?.rarity ?? existing?.rarity ?? "comum",
    stickerType: apiRow?.stickerType ?? existing?.stickerType ?? null,
    effect: apiRow?.effect ?? existing?.effect ?? null,
    tournament: apiRow?.tournament ?? existing?.tournament ?? null,
    enabled: input.enabled ?? existing?.enabled ?? true,
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
  return upsertStickerRow({ defIndex, source: "admin", enabled }, apiRow);
}

export async function importAllStickersFromApi(options?: { enabled?: boolean }) {
  const apiRows = await listAllStickersFromApi();
  let imported = 0;
  for (const apiRow of apiRows) {
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
  return { imported };
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

export async function listEnabledStickersForPicker(search?: string, limit = 60) {
  const trimmed = search?.trim() ?? "";
  const rows = await prisma.csgoStickerCatalog.findMany({
    where: {
      enabled: true,
      ...(trimmed
        ? { name: { contains: trimmed, mode: "insensitive" } }
        : {}),
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  if (rows.length > 0) {
    return rows.map(serializeRow);
  }

  const apiRows = await listAllStickersFromApi();
  const filtered = trimmed
    ? apiRows.filter((row) => row.name.toLowerCase().includes(trimmed.toLowerCase()))
    : apiRows;

  return filtered.slice(0, limit).map((row) => ({
    id: row.id,
    defIndex: row.defIndex,
    name: row.name,
    imageUrl: row.imageUrl,
    rarity: row.rarity,
    stickerType: row.stickerType,
    effect: row.effect,
    tournament: row.tournament,
    enabled: true,
    source: "api-fallback",
    updatedAt: new Date().toISOString(),
  }));
}
