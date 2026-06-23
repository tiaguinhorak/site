import "server-only";

import type { CsgoSkinCatalog } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  lookupCatalogFromApi,
  listApiSkinsForWeapon,
  type CatalogRowFromApi,
} from "@/lib/inventory/csgo-api-index";
import {
  assertPaintkitCsgoCompatible,
  classifyPaintkitGameClient,
  isCatalogGameClientCs2,
  resolvePaintkitCompat,
  type CatalogGameClient,
} from "@/lib/inventory/csgo-paintkit-compat";
import { invalidateCatalogReadyCache } from "@/lib/inventory/ensure-catalog-synced";
import { triggerWeaponsCfgSyncOnVps } from "@/lib/inventory/trigger-weapons-cfg-sync";
import { fetchWsAllowlistKeys, wsCatalogKey } from "@/lib/inventory/ws-allowlist";

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
  gameClient: CatalogGameClient;
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
    gameClient: (row.gameClient as CatalogGameClient) ?? "unknown",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function lookupCatalogSkinPreview(weaponId: string, paintkit: number) {
  const fromApi = await lookupCatalogFromApi(weaponId, paintkit);
  const compat = await resolvePaintkitCompat(weaponId, paintkit, fromApi !== null);
  const existing = await prisma.csgoSkinCatalog.findFirst({
    where: { weaponId, paintkit },
  });
  return {
    found: fromApi !== null,
    api: fromApi,
    existing: existing ? serializeRow(existing) : null,
    compatibility: compat,
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

  const allowlist = await fetchWsAllowlistKeys();
  const compat = classifyPaintkitGameClient(
    input.weaponId,
    input.paintkit,
    allowlist,
    apiRow !== null,
  );

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
    gameClient: compat.gameClient,
  };

  if (data.enabled && !compat.csgoCompatible) {
    data.enabled = false;
  }

  const id = existing?.id ?? input.id ?? apiRow?.id ?? `${input.weaponId}_${input.paintkit}`;

  const row = await prisma.csgoSkinCatalog.upsert({
    where: { id },
    create: {
      id,
      ...data,
      source: input.source,
      enabled: data.enabled,
    },
    update: data,
  });

  return serializeRow(row);
}

async function afterCatalogMutation(): Promise<void> {
  await invalidateCatalogReadyCache();
  triggerWeaponsCfgSyncOnVps();
}

export async function upsertCatalogSkinFromPaintkit(input: UpsertInput) {
  const apiRow = await lookupCatalogFromApi(input.weaponId, input.paintkit);
  if (!apiRow && !input.paintkitName) {
    throw new Error(
      "Skin não encontrada na CSGO-API. Confira weaponId e paintkit ou preencha nome manualmente.",
    );
  }

  const compat = await resolvePaintkitCompat(input.weaponId, input.paintkit, apiRow !== null);
  if (!compat.csgoCompatible && (input.enabled ?? true)) {
    throw new Error(
      `Skin bloqueada (CS2): ${compat.reason} Use uma skin da lista CS:GO (!ws).`,
    );
  }

  const row = await upsertCatalogRow(input, apiRow);
  await afterCatalogMutation();
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

  const allowlist = await fetchWsAllowlistKeys();
  let imported = 0;
  let skippedCs2 = 0;

  for (const apiRow of apiRows) {
    const compat = classifyPaintkitGameClient(
      apiRow.weaponId,
      apiRow.paintkit,
      allowlist,
      true,
    );
    if (!compat.csgoCompatible) {
      skippedCs2 += 1;
      continue;
    }

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

  await afterCatalogMutation();
  return { imported, skippedCs2, weaponId };
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

  const unknownRows = rows.filter((row) => row.gameClient === "unknown");
  if (unknownRows.length > 0) {
    const allowlist = await fetchWsAllowlistKeys();
    for (const row of unknownRows) {
      const gameClient = classifyPaintkitGameClient(
        row.weaponId,
        row.paintkit,
        allowlist,
        true,
      ).gameClient;
      if (gameClient !== "unknown") {
        row.gameClient = gameClient;
        await prisma.csgoSkinCatalog.update({
          where: { id: row.id },
          data: { gameClient, ...(gameClient === "cs2" ? { enabled: false } : {}) },
        });
      }
    }
  }

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
  const existing = await prisma.csgoSkinCatalog.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Skin não encontrada.");
  }

  if (data.enabled === true) {
    await assertPaintkitCsgoCompatible(existing.weaponId, existing.paintkit, true);
    if (isCatalogGameClientCs2(existing.gameClient)) {
      throw new Error("Skin marcada como CS2 — não pode ser ativada no servidor CS:GO.");
    }
  }

  const row = await prisma.csgoSkinCatalog.update({
    where: { id },
    data: {
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.paintkitName !== undefined ? { paintkitName: data.paintkitName } : {}),
    },
  });
  await afterCatalogMutation();
  return serializeRow(row);
}

export async function deleteCatalogSkinAdmin(id: string) {
  await prisma.csgoSkinCatalog.delete({ where: { id } });
  await afterCatalogMutation();
  return { ok: true };
}

export async function getEnabledCatalogAllowlistEntries() {
  const rows = await prisma.csgoSkinCatalog.findMany({
    where: { enabled: true, gameClient: { not: "cs2" } },
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
