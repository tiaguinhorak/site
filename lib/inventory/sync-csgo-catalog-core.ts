import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  apiSkinToCatalogRow,
  CSGO_API_SKINS_URL,
  type CsgoApiSkin,
} from "@/lib/inventory/csgo-api-index";
import {
  fetchWsAllowlistKeys,
  getWsAllowlistSource,
  isInWsAllowlist,
} from "@/lib/inventory/ws-allowlist";

const BATCH_SIZE = 20;
const TX_TIMEOUT_MS = 120_000;

function catalogAllowlistSource(): string {
  return process.env.CATALOG_ALLOWLIST_SOURCE?.trim().toLowerCase() ?? "ws";
}

export async function fetchSiteEnabledAllowlistKeys(prisma: PrismaClient): Promise<Set<string>> {
  const rows = await prisma.csgoSkinCatalog.findMany({
    where: { enabled: true },
    select: { weaponId: true, paintkit: true },
  });
  const keys = new Set<string>();
  for (const row of rows) {
    keys.add(`${row.weaponId}:${row.paintkit}`);
  }
  return keys;
}

export async function syncCsgoSkinCatalogWithClient(prisma: PrismaClient) {
  const response = await fetch(CSGO_API_SKINS_URL);
  if (!response.ok) {
    throw new Error(`Falha ao baixar catálogo CS:GO (${response.status}).`);
  }

  const payload = (await response.json()) as CsgoApiSkin[];

  let wsAllowlist: Set<string>;
  const allowlistMode = catalogAllowlistSource();

  if (allowlistMode === "site-db" || allowlistMode === "site") {
    wsAllowlist = await fetchSiteEnabledAllowlistKeys(prisma);
    console.log(`[catalog] allowlist from Postgres enabled skins (${wsAllowlist.size} keys)`);
  } else {
    wsAllowlist = await fetchWsAllowlistKeys();
    if (wsAllowlist.size > 0) {
      console.log(
        `[catalog] ws-allowlist loaded (${wsAllowlist.size} keys, source: ${getWsAllowlistSource()})`,
      );
    }
  }

  const allRows = payload
    .map((skin) => apiSkinToCatalogRow(skin))
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => isInWsAllowlist(row.weaponId, row.paintkit, wsAllowlist));

  let synced = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((row) =>
        prisma.csgoSkinCatalog.upsert({
          where: { id: row.id },
          create: {
            ...row,
            enabled: allowlistMode === "site-db" || allowlistMode === "site",
            source: "sync",
          },
          update: {
            weaponId: row.weaponId,
            weaponName: row.weaponName,
            paintkit: row.paintkit,
            paintkitName: row.paintkitName,
            rarity: row.rarity,
            category: row.category,
            imageUrl: row.imageUrl,
            weaponDefIndex: row.weaponDefIndex,
          },
        }),
      ),
      { timeout: TX_TIMEOUT_MS },
    );
    synced += batch.length;
  }

  // Never delete admin/import skins — only prune legacy sync-only rows when using external ws allowlist.
  if (
    wsAllowlist.size > 0 &&
    allRows.length > 0 &&
    allowlistMode !== "site-db" &&
    allowlistMode !== "site"
  ) {
    const allowedIds = allRows.map((row) => row.id);
    await prisma.csgoSkinCatalog.deleteMany({
      where: {
        id: { notIn: allowedIds },
        source: "sync",
      },
    });
  }

  return {
    synced,
    wsOnly: wsAllowlist.size > 0,
    allowlistMode,
  };
}
