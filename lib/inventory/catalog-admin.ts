import "server-only";

import type { CsgoSkinCatalog } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  lookupCatalogFromApi,
  listApiSkinsForWeapon,
  type CatalogRowFromApi,
} from "@/lib/inventory/csgo-api-index";
import { invalidateCatalogReadyCache } from "@/lib/inventory/ensure-catalog-synced";
import { wsCatalogKey } from "@/lib/inventory/ws-allowlist";

export type CatalogSkinSource = "sync" | "admin" | "import";

export type CatalogSkinAdminRow = {
  id: string;
  weaponId: string;
  weaponName: string;
  paintkit: number;
  paintkitName: string;
  rarity: string;
  category: string;
  imageUrl: string | null;
  weaponDefIndex: number | null;
  enabled: boolean;
  source: string;
  updatedAt: string;
};

function serializeRow(row: CsgoSkinCatalog): CatalogSkinAdminRow {
  return {
    id: row.id,
    weaponId: row.weaponId,
    weaponName: row.weaponName,
    paintkit: row.paintkit,
    paintkitName: row.paintkitName,
    rarity: row.rarity,
    category: row.category,
    imageUrl: row.imageUrl,
    weaponDefIndex: row.weaponDefIndex,
    enabled: row.enabled,
    source: row.source,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function lookupCatalogSkinPreview(weaponId: string, paintkit: number) {
  const fromApi = await lookupCatalogFromApi(weaponId, paintkit);
  const existing = await prisma.csgoSkinCatalog.findFirst({
    where: { weaponId, paintkit },
  });
  return {
    found: fromApi !== null,
    api: fromApi,
    existing: existing ? serializeRow(existing) : null,
  };
}

type UpsertInput = {
  weaponId: string;
  paintkit: number;
  source: CatalogSkinSource;
  enabled?: boolean;
  paintkitName?: string;
  weaponName?: string;
  rarity?: string;
  category?: string;
  imageUrl?: string | null;
  weaponDefIndex?: number | null;
  id?: string;
};

async function upsertCatalogRow(input: UpsertInput, apiRow: CatalogRowFromApi | null) {
  const existing = await prisma.csgoSkinCatalog.findFirst({
    where: { weaponId: input.weaponId, paintkit: input.paintkit },
  });

  const data = {
    weaponId: input.weaponId,
    weaponName: input.weaponName ?? apiRow?.weaponName ?? existing?.weaponName ?? "Weapon",
    paintkit: input.paintkit,
    paintkitName:
      input.paintkitName ?? apiRow?.paintkitName ?? existing?.paintkitName ?? `Paint ${input.paintkit}`,
    rarity: input.rarity ?? apiRow?.rarity ?? existing?.rarity ?? "comum",
    category: input.category ?? apiRow?.category ?? existing?.category ?? "rifle",
    imageUrl: input.imageUrl ?? apiRow?.imageUrl ?? existing?.imageUrl ?? null,
    weaponDefIndex:
      input.weaponDefIndex ?? apiRow?.weaponDefIndex ?? existing?.weaponDefIndex ?? null,
    enabled: input.enabled ?? existing?.enabled ?? true,
    source: existing?.source && existing.source !== "sync" ? existing.source : input.source,
  };

  const id = existing?.id ?? input.id ?? apiRow?.id ?? `${input.weaponId}_${input.paintkit}`;

  const row = await prisma.csgoSkinCatalog.upsert({
    where: { id },
    create: {
      id,
      ...data,
      source: input.source,
      enabled: input.enabled ?? true,
    },
    update: data,
  });

  return serializeRow(row);
}

export async function upsertCatalogSkinFromPaintkit(input: UpsertInput) {
  const apiRow = await lookupCatalogFromApi(input.weaponId, input.paintkit);
  if (!apiRow && !input.paintkitName) {
    throw new Error(
      "Skin não encontrada na CSGO-API. Confira weaponId e paintkit ou preencha nome manualmente.",
    );
  }
  const row = await upsertCatalogRow(input, apiRow);
  await invalidateCatalogReadyCache();
  return row;
}

export async function importWeaponSkinsFromApi(
  weaponId: string,
  options?: { enabled?: boolean },
) {
  const apiRows = await listApiSkinsForWeapon(weaponId);
  if (!apiRows.length) {
    throw new Error(`Nenhuma skin na CSGO-API para ${weaponId}.`);
  }

  let imported = 0;
  for (const apiRow of apiRows) {
    await upsertCatalogRow(
      {
        weaponId: apiRow.weaponId,
        paintkit: apiRow.paintkit,
        source: "import",
        enabled: options?.enabled ?? true,
        id: apiRow.id,
      },
      apiRow,
    );
    imported += 1;
  }

  await invalidateCatalogReadyCache();
  return { imported, weaponId };
}

export async function listCatalogSkinsAdmin(options: {
  page?: number;
  limit?: number;
  search?: string;
  weaponId?: string;
  enabledOnly?: boolean;
}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 40));
  const search = options.search?.trim() ?? "";

  const where = {
    ...(options.weaponId ? { weaponId: options.weaponId } : {}),
    ...(options.enabledOnly ? { enabled: true } : {}),
    ...(search
      ? {
          OR: [
            { paintkitName: { contains: search, mode: "insensitive" as const } },
            { weaponName: { contains: search, mode: "insensitive" as const } },
            { weaponId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.csgoSkinCatalog.count({ where }),
    prisma.csgoSkinCatalog.findMany({
      where,
      orderBy: [{ weaponName: "asc" }, { paintkitName: "asc" }],
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

export async function updateCatalogSkinAdmin(
  id: string,
  data: {
    enabled?: boolean;
    imageUrl?: string | null;
    paintkitName?: string;
  },
) {
  const row = await prisma.csgoSkinCatalog.update({
    where: { id },
    data: {
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.paintkitName !== undefined ? { paintkitName: data.paintkitName } : {}),
    },
  });
  await invalidateCatalogReadyCache();
  return serializeRow(row);
}

export async function deleteCatalogSkinAdmin(id: string) {
  await prisma.csgoSkinCatalog.delete({ where: { id } });
  await invalidateCatalogReadyCache();
  return { ok: true };
}

export async function getEnabledCatalogAllowlistEntries() {
  const rows = await prisma.csgoSkinCatalog.findMany({
    where: { enabled: true },
    select: {
      weaponId: true,
      paintkit: true,
      paintkitName: true,
      weaponName: true,
    },
    orderBy: [{ weaponName: "asc" }, { paintkit: "asc" }],
  });

  return rows.map((row) => ({
    weaponId: row.weaponId,
    paintkit: row.paintkit,
    name: `${row.weaponName} | ${row.paintkitName}`,
    key: wsCatalogKey(row.weaponId, row.paintkit),
  }));
}

export function buildWeaponsCfgSnippet(
  entries: Array<{ weaponId: string; paintkit: number; name: string }>,
): string {
  const lines: string[] = ["// Generated by clutchclube admin — paste into weapons_english.cfg"];
  for (const entry of entries) {
    const safeName = entry.name.replace(/"/g, "'");
    lines.push(`\t"${safeName}" {`);
    lines.push(`\t\t"index"\t\t"${entry.paintkit}"`);
    lines.push(`\t\t"classes"\t\t"${entry.weaponId}"`);
    lines.push(`\t}`);
  }
  return lines.join("\n");
}
