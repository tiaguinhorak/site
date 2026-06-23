import "server-only";

import { prisma } from "@/lib/prisma";
import { steamId64ToSteam2 } from "@/lib/steam/steam-id";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import {
  teamEquipField,
  type LoadoutTeam,
} from "@/lib/inventory/loadout-team";
import type { InventoryCategoryKey } from "@/lib/profile";

export type UserLoadoutItem = {
  catalogSkinId: string;
  name: string;
  category: InventoryCategoryKey;
  weaponId: string;
  paintkit: number;
  paintkitName: string;
  imageUrl: string | null;
  rarity: string;
  accent: string;
  team: LoadoutTeam;
  equippedAt: string;
};

export async function getUserServerLoadout(userId: string, team?: LoadoutTeam) {
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

  const equippedField = team ? teamEquipField(team) : null;
  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: {
      steamId: user.steamId,
      ...(equippedField ? { [equippedField]: true } : { equipped: true }),
    },
    include: { skin: true },
    orderBy: { createdAt: "desc" },
  });

  const items: UserLoadoutItem[] = [];

  for (const row of equipped) {
    const teams: LoadoutTeam[] = team
      ? [team]
      : row.equippedT && row.equippedCT
        ? ["T", "CT"]
        : row.equippedT
          ? ["T"]
          : row.equippedCT
            ? ["CT"]
            : [];

    for (const side of teams) {
      items.push({
        catalogSkinId: row.skinId,
        name: `${row.skin.weaponName} | ${row.skin.paintkitName}`,
        category: row.skin.category as InventoryCategoryKey,
        weaponId: row.skin.weaponId,
        paintkit: row.skin.paintkit,
        paintkitName: row.skin.paintkitName,
        imageUrl: row.skin.imageUrl ?? catalogSkinImageUrl(row.skinId) ?? null,
        rarity: row.skin.rarity,
        accent: rarityAccent(row.skin.rarity),
        team: side,
        equippedAt: row.createdAt.toISOString(),
      });
    }
  }

  return {
    steamLinked: true,
    steamId: user.steamId,
    steamId2: steamId64ToSteam2(user.steamId) ?? null,
    items,
  };
}
