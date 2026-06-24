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

export type LoadoutSticker = {
  slot: number;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

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
  stickers: LoadoutSticker[];
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

  const stickerRows = await prisma.csgoPlayerWeaponSticker.findMany({
    where: {
      steamId: user.steamId,
      ...(team ? { team } : {}),
    },
  });

  const defIndices = new Set<number>();
  for (const row of stickerRows) {
    for (const defIndex of [
      row.slot0,
      row.slot1,
      row.slot2,
      row.slot3,
      row.slot4,
    ]) {
      if (defIndex > 0) defIndices.add(defIndex);
    }
  }

  const catalogStickers =
    defIndices.size > 0
      ? await prisma.csgoStickerCatalog.findMany({
          where: { defIndex: { in: [...defIndices] } },
        })
      : [];
  const stickerCatalogByDef = new Map(
    catalogStickers.map((entry) => [entry.defIndex, entry]),
  );

  function stickersForWeapon(weaponId: string, side: LoadoutTeam): LoadoutSticker[] {
    const row = stickerRows.find((r) => r.weaponId === weaponId && r.team === side);
    if (!row) return [];

    const slotValues = [row.slot0, row.slot1, row.slot2, row.slot3, row.slot4];
    const stickers: LoadoutSticker[] = [];

    slotValues.forEach((defIndex, slot) => {
      if (defIndex <= 0) return;
      const catalog = stickerCatalogByDef.get(defIndex);
      stickers.push({
        slot,
        defIndex,
        name: catalog?.name ?? `Sticker ${defIndex}`,
        imageUrl: catalog?.imageUrl ?? null,
      });
    });

    return stickers;
  }

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
        stickers: stickersForWeapon(row.skin.weaponId, side),
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
