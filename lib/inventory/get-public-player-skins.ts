import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveCatalogSkinImageUrlServer } from "@/lib/inventory/resolve-catalog-image-server";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import type { InventoryCategoryKey } from "@/lib/profile";

export type PublicSkinItem = {
  id: string;
  name: string;
  weaponName: string;
  paintkitName: string;
  category: InventoryCategoryKey;
  rarity: string;
  accent: string;
  imageUrl: string | null;
  stattrak: boolean;
  equippedT: boolean;
  equippedCT: boolean;
};

export type PublicSkinGroup = {
  category: InventoryCategoryKey;
  items: PublicSkinItem[];
};

const CATEGORY_ORDER: InventoryCategoryKey[] = [
  "knife",
  "gloves",
  "rifle",
  "pistol",
  "smg",
  "agent",
];

function buildGroups(items: PublicSkinItem[]): PublicSkinGroup[] {
  const byCategory = new Map<InventoryCategoryKey, PublicSkinItem[]>();

  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  const groups: PublicSkinGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const groupItems = byCategory.get(category);
    if (groupItems && groupItems.length > 0) {
      groups.push({ category, items: groupItems });
    }
  }
  return groups;
}

/** Equipped skins for a public profile — unified grid with TR/CT badges. */
export async function getPublicPlayerSkins(
  steamId: string | null,
): Promise<{ total: number; groups: PublicSkinGroup[] }> {
  if (!steamId) return { total: 0, groups: [] };

  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: {
      steamId,
      OR: [{ equippedT: true }, { equippedCT: true }],
    },
    include: { skin: true },
    orderBy: { createdAt: "desc" },
  });

  const items: PublicSkinItem[] = await Promise.all(
    equipped.map(async (row) => ({
      id: row.skinId,
      name: `${row.skin.weaponName} | ${row.skin.paintkitName}`,
      weaponName: row.skin.weaponName,
      paintkitName: row.skin.paintkitName,
      category: row.skin.category as InventoryCategoryKey,
      rarity: row.skin.rarity,
      accent: rarityAccent(row.skin.rarity),
      imageUrl: await resolveCatalogSkinImageUrlServer(row.skin.imageUrl, row.skinId, 512),
      stattrak: row.stattrak,
      equippedT: row.equippedT,
      equippedCT: row.equippedCT,
    })),
  );

  return {
    total: items.length,
    groups: buildGroups(items),
  };
}
