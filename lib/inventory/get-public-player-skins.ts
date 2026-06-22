import "server-only";

import { prisma } from "@/lib/prisma";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
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

/** Equipped skins for a public profile, grouped and ordered by category. */
export async function getPublicPlayerSkins(
  steamId: string | null,
): Promise<{ total: number; groups: PublicSkinGroup[] }> {
  if (!steamId) return { total: 0, groups: [] };

  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: { steamId, equipped: true },
    include: { skin: true },
    orderBy: { createdAt: "desc" },
  });

  const byCategory = new Map<InventoryCategoryKey, PublicSkinItem[]>();

  for (const row of equipped) {
    const category = row.skin.category as InventoryCategoryKey;
    const item: PublicSkinItem = {
      id: row.skinId,
      name: `${row.skin.weaponName} | ${row.skin.paintkitName}`,
      weaponName: row.skin.weaponName,
      paintkitName: row.skin.paintkitName,
      category,
      rarity: row.skin.rarity,
      accent: rarityAccent(row.skin.rarity),
      imageUrl: row.skin.imageUrl ?? catalogSkinImageUrl(row.skinId) ?? null,
      stattrak: row.stattrak,
    };
    const list = byCategory.get(category) ?? [];
    list.push(item);
    byCategory.set(category, list);
  }

  const groups: PublicSkinGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const items = byCategory.get(category);
    if (items && items.length > 0) {
      groups.push({ category, items });
    }
  }

  return { total: equipped.length, groups };
}
