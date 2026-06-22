import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  isWeaponSkinCategory,
  mapCatalogCategoryToUi,
  rarityLabelFromId,
} from "@/lib/inventory/catalog-categories";

const CSGO_API_SKINS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

const BATCH_SIZE = 40;

type ApiSkin = {
  id: string;
  name: string;
  image?: string;
  paint_index?: string | number;
  category?: { id?: string };
  weapon?: { id?: string; name?: string };
  pattern?: { name?: string };
  rarity?: { id?: string };
};

function normalizeWeaponId(skin: ApiSkin): string | null {
  if (!skin.weapon?.id) return null;
  return String(skin.weapon.id);
}

function toCatalogRow(skin: ApiSkin) {
  const weaponId = normalizeWeaponId(skin);
  const paintkit = Number(skin.paint_index);
  if (!weaponId || !Number.isFinite(paintkit) || paintkit <= 0) return null;
  if (!isWeaponSkinCategory(skin.category?.id)) return null;

  return {
    id: skin.id,
    weaponId,
    weaponName: skin.weapon?.name ?? "Weapon",
    paintkit,
    paintkitName: skin.pattern?.name ?? skin.name,
    rarity: rarityLabelFromId(skin.rarity?.id ?? "rarity_common_weapon"),
    category: mapCatalogCategoryToUi(skin.category?.id, weaponId),
    imageUrl: skin.image ?? null,
  };
}

export async function syncCsgoSkinCatalogWithClient(prisma: PrismaClient) {
  const response = await fetch(CSGO_API_SKINS_URL);
  if (!response.ok) {
    throw new Error(`Falha ao baixar catálogo CS:GO (${response.status}).`);
  }

  const payload = (await response.json()) as ApiSkin[];
  const rows = payload
    .map(toCatalogRow)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  let synced = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
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
          },
        }),
      ),
    );
    synced += batch.length;
  }

  return { synced };
}
