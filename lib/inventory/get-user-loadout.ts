import "server-only";

import { prisma } from "@/lib/prisma";
import { steamId64ToSteam2 } from "@/lib/steam/steam-id";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import type { InventoryCategoryKey } from "@/lib/profile";

export type UserLoadoutItem = {
  catalogSkinId: string;
  name: string;
  category: InventoryCategoryKey;
  weaponId: string;
  paintkit: number;
  paintkitName: string;
  imageUrl: string | null;
  accent: string;
  equippedAt: string;
};

export async function getUserServerLoadout(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });

  if (!user?.steamId) {
    return {
      steamLinked: false,
      steamId: null,
      items: [] as UserLoadoutItem[],
    };
  }

  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: { steamId: user.steamId, equipped: true },
    include: { skin: true },
    orderBy: { createdAt: "desc" },
  });

  const items: UserLoadoutItem[] = equipped.map((row) => ({
    catalogSkinId: row.skinId,
    name: `${row.skin.weaponName} | ${row.skin.paintkitName}`,
    category: row.skin.category as InventoryCategoryKey,
    weaponId: row.skin.weaponId,
    paintkit: row.skin.paintkit,
    paintkitName: row.skin.paintkitName,
    imageUrl: row.skin.imageUrl ?? catalogSkinImageUrl(row.skinId) ?? null,
    accent: rarityAccent(row.skin.rarity),
    equippedAt: row.createdAt.toISOString(),
  }));

  return {
    steamLinked: true,
    steamId: user.steamId,
    steamId2: steamId64ToSteam2(user.steamId) ?? null,
    items,
  };
}
