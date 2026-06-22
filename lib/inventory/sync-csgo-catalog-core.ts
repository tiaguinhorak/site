import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  isWeaponSkinCategory,
  mapCatalogCategoryToUi,
  rarityLabelFromId,
} from "@/lib/inventory/catalog-categories";
import {
  fetchWsAllowlistKeys,
  getWsAllowlistSource,
  isInWsAllowlist,
} from "@/lib/inventory/ws-allowlist";

const CSGO_API_SKINS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

const BATCH_SIZE = 20;
const TX_TIMEOUT_MS = 120_000;

type ApiSkin = {
  id: string;
  name: string;
  image?: string;
  paint_index?: string | number;
  category?: { id?: string };
  weapon?: { id?: string; name?: string; weapon_id?: number | string };
  pattern?: { name?: string };
  rarity?: { id?: string };
};

function normalizeWeaponId(skin: ApiSkin): string | null {
  if (!skin.weapon?.id) return null;
  const id = String(skin.weapon.id);
  if (id.startsWith("sfui_wpnhud_")) return null;
  return id;
}

function toCatalogRow(skin: ApiSkin) {
  const weaponId = normalizeWeaponId(skin);
  const paintkit = Number(skin.paint_index);
  if (!weaponId || !Number.isFinite(paintkit) || paintkit <= 0) return null;
  if (!isWeaponSkinCategory(skin.category?.id)) return null;

  const rawDefIndex = skin.weapon?.weapon_id;
  const weaponDefIndex =
    rawDefIndex !== undefined && rawDefIndex !== null && Number.isFinite(Number(rawDefIndex))
      ? Number(rawDefIndex)
      : null;

  return {
    id: skin.id,
    weaponId,
    weaponName: skin.weapon?.name ?? "Weapon",
    paintkit,
    paintkitName: skin.pattern?.name ?? skin.name,
    rarity: rarityLabelFromId(skin.rarity?.id ?? "rarity_common_weapon"),
    category: mapCatalogCategoryToUi(skin.category?.id, weaponId),
    imageUrl: skin.image ?? null,
    weaponDefIndex,
  };
}

export async function syncCsgoSkinCatalogWithClient(prisma: PrismaClient) {
  const response = await fetch(CSGO_API_SKINS_URL);
  if (!response.ok) {
    throw new Error(`Falha ao baixar catálogo CS:GO (${response.status}).`);
  }

  const payload = (await response.json()) as ApiSkin[];
  const wsAllowlist = await fetchWsAllowlistKeys();
  if (wsAllowlist.size > 0) {
    console.log(`[catalog] ws-allowlist loaded (${wsAllowlist.size} keys, source: ${getWsAllowlistSource()})`);
  }
  const allRows = payload
    .map(toCatalogRow)
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => isInWsAllowlist(row.weaponId, row.paintkit, wsAllowlist));

  let synced = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((row) =>
        prisma.csgoSkinCatalog.upsert({
          where: { id: row.id },
          create: row,
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

  if (wsAllowlist.size > 0 && allRows.length > 0) {
    const allowedIds = allRows.map((row) => row.id);
    await prisma.csgoSkinCatalog.deleteMany({
      where: { id: { notIn: allowedIds } },
    });
  }

  return { synced, wsOnly: wsAllowlist.size > 0 };
}
