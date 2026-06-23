import "server-only";

import { prisma } from "@/lib/prisma";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
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
  team: LoadoutTeam;
};

export type PublicSkinGroup = {
  category: InventoryCategoryKey;
  items: PublicSkinItem[];
};

export type PublicLoadoutSide = {
  team: LoadoutTeam;
  total: number;
  groups: PublicSkinGroup[];
};

const CATEGORY_ORDER: InventoryCategoryKey[] = [
  "knife",
  "gloves",
  "rifle",
  "pistol",
  "smg",
  "agent",
];

function buildGroups(rows: Array<{
  skinId: string;
  stattrak: boolean;
  skin: {
    weaponName: string;
    paintkitName: string;
    category: string;
    rarity: string;
    imageUrl: string | null;
  };
  team: LoadoutTeam;
}>): PublicSkinGroup[] {
  const byCategory = new Map<InventoryCategoryKey, PublicSkinItem[]>();

  for (const row of rows) {
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
      team: row.team,
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
  return groups;
}

/** Equipped skins for a public profile, grouped by team and category. */
export async function getPublicPlayerSkins(
  steamId: string | null,
): Promise<{ total: number; sides: PublicLoadoutSide[] }> {
  if (!steamId) return { total: 0, sides: [] };

  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: {
      steamId,
      OR: [{ equippedT: true }, { equippedCT: true }],
    },
    include: { skin: true },
    orderBy: { createdAt: "desc" },
  });

  const tRows: Array<typeof equipped[number] & { team: LoadoutTeam }> = [];
  const ctRows: Array<typeof equipped[number] & { team: LoadoutTeam }> = [];

  for (const row of equipped) {
    if (row.equippedT) tRows.push({ ...row, team: "T" });
    if (row.equippedCT) ctRows.push({ ...row, team: "CT" });
  }

  const sides: PublicLoadoutSide[] = [];
  if (tRows.length > 0) {
    sides.push({ team: "T", total: tRows.length, groups: buildGroups(tRows) });
  }
  if (ctRows.length > 0) {
    sides.push({ team: "CT", total: ctRows.length, groups: buildGroups(ctRows) });
  }

  return { total: tRows.length + ctRows.length, sides };
}
