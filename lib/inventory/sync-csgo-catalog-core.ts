import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  apiSkinToCatalogRow,
  CSGO_API_SKINS_URL,
  type CsgoApiSkin,
} from "@/lib/inventory/csgo-api-index";
import { catalogLocalImagePath } from "@/lib/inventory/catalog-image-path";
import { mirrorCatalogImage } from "@/lib/inventory/mirror-catalog-image";
import { classifyPaintkitGameClient } from "@/lib/inventory/csgo-paintkit-compat";
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

async function persistLocalImageUrl(
  prisma: PrismaClient,
  catalogId: string,
  remoteImageUrl: string | null,
): Promise<string | null> {
  const mirrored = await mirrorCatalogImage(catalogId, remoteImageUrl);
  if (!mirrored.ok) {
    console.warn(`[catalog] image mirror failed for ${catalogId}: ${mirrored.error}`);
    return null;
  }
  const localPath = mirrored.localPath;
  await prisma.csgoSkinCatalog.update({
    where: { id: catalogId },
    data: { imageUrl: localPath },
  });
  return localPath;
}

export async function syncCsgoSkinCatalogWithClient(
  prisma: PrismaClient,
  options?: { mirrorImages?: boolean },
) {
  const mirrorImages = options?.mirrorImages ?? true;
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
  let imagesMirrored = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((row) =>
        prisma.csgoSkinCatalog.upsert({
          where: { id: row.id },
          create: {
            ...row,
            imageUrl: catalogLocalImagePath(row.id),
            enabled: allowlistMode === "site-db" || allowlistMode === "site",
            source: "sync",
            gameClient: classifyPaintkitGameClient(row.weaponId, row.paintkit, wsAllowlist, true)
              .gameClient,
          },
          update: {
            weaponId: row.weaponId,
            weaponName: row.weaponName,
            paintkit: row.paintkit,
            paintkitName: row.paintkitName,
            rarity: row.rarity,
            category: row.category,
            weaponDefIndex: row.weaponDefIndex,
            gameClient: "csgo",
          },
        }),
      ),
      { timeout: TX_TIMEOUT_MS },
    );
    synced += batch.length;

    if (mirrorImages) {
      for (const row of batch) {
        const localPath = await persistLocalImageUrl(prisma, row.id, row.imageUrl);
        if (localPath) imagesMirrored += 1;
      }
      if ((i / BATCH_SIZE + 1) % 5 === 0) {
        console.log(`[catalog] progress ${synced}/${allRows.length} skins, ${imagesMirrored} images`);
      }
    }
  }

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
    imagesMirrored,
    wsOnly: wsAllowlist.size > 0,
    allowlistMode,
  };
}
