import "server-only";

import { prisma } from "@/lib/prisma";
import { steamId64ToSteam2 } from "@/lib/steam/steam-id";
import { resolveCatalogSkinImageUrlServer } from "@/lib/inventory/resolve-catalog-image-server";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import {
  teamEquipField,
  normalizeWeaponId,
  type LoadoutTeam,
} from "@/lib/inventory/loadout-team";
import type { InventoryCategoryKey } from "@/lib/profile";
import { lookupStickerFromApi } from "@/lib/inventory/csgo-api-sticker-index";
import { normalizeStickerImageUrl } from "@/lib/inventory/sticker-image-url";
import { getPlayerAgents } from "@/lib/inventory/player-agents";

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
  floatValue: number;
  seed: number;
  stattrak: boolean;
  nametag: string | null;
  equippedT: boolean;
  equippedCT: boolean;
  equippedAt: string;
  stickersT: LoadoutSticker[];
  stickersCT: LoadoutSticker[];
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

  const apiStickerFallbacks = new Map<number, { name: string; imageUrl: string | null }>();
  for (const defIndex of defIndices) {
    if (stickerCatalogByDef.has(defIndex)) continue;
    const api = await lookupStickerFromApi(defIndex);
    if (api) {
      apiStickerFallbacks.set(defIndex, { name: api.name, imageUrl: api.imageUrl });
    }
  }

  function stickersForWeapon(weaponId: string, side: LoadoutTeam): LoadoutSticker[] {
    const normalized = normalizeWeaponId(weaponId);
    const row = stickerRows.find(
      (r) => normalizeWeaponId(r.weaponId) === normalized && r.team === side,
    );
    if (!row) return [];

    const slotValues = [row.slot0, row.slot1, row.slot2, row.slot3, row.slot4];
    const stickers: LoadoutSticker[] = [];

    slotValues.forEach((defIndex, slot) => {
      if (defIndex <= 0) return;
      const catalog = stickerCatalogByDef.get(defIndex);
      const api = apiStickerFallbacks.get(defIndex);
      stickers.push({
        slot,
        defIndex,
        name: catalog?.name ?? api?.name ?? `Sticker ${defIndex}`,
        imageUrl: normalizeStickerImageUrl(catalog?.imageUrl ?? api?.imageUrl ?? null),
      });
    });

    return stickers;
  }

  const items: UserLoadoutItem[] = await Promise.all(
    equipped.map(async (row) => ({
      catalogSkinId: row.skinId,
      name: `${row.skin.weaponName} | ${row.skin.paintkitName}`,
      category: row.skin.category as InventoryCategoryKey,
      weaponId: row.skin.weaponId,
      paintkit: row.skin.paintkit,
      paintkitName: row.skin.paintkitName,
      imageUrl: await resolveCatalogSkinImageUrlServer(row.skin.imageUrl, row.skinId, 512),
      rarity: row.skin.rarity,
      accent: rarityAccent(row.skin.rarity),
      floatValue: row.floatValue,
      seed: row.seed,
      stattrak: row.stattrak,
      nametag: row.nametag,
      equippedT: row.equippedT,
      equippedCT: row.equippedCT,
      equippedAt: row.createdAt.toISOString(),
      stickersT: stickersForWeapon(row.skin.weaponId, "T"),
      stickersCT: stickersForWeapon(row.skin.weaponId, "CT"),
    })),
  );

  const agents = await getPlayerAgents(user.steamId);
  if (agents.agentT > 0 && agents.agentTName) {
    items.push({
      catalogSkinId: `agent-t-${agents.agentT}`,
      name: agents.agentTName,
      category: "agent",
      weaponId: "agent_t",
      paintkit: agents.agentT,
      paintkitName: agents.agentTName,
      imageUrl: agents.agentTImage,
      rarity: "lendário",
      accent: rarityAccent("lendário"),
      floatValue: 0,
      seed: 0,
      stattrak: false,
      nametag: null,
      equippedT: true,
      equippedCT: false,
      equippedAt: new Date().toISOString(),
      stickersT: [],
      stickersCT: [],
    });
  }
  if (agents.agentCT > 0 && agents.agentCTName) {
    items.push({
      catalogSkinId: `agent-ct-${agents.agentCT}`,
      name: agents.agentCTName,
      category: "agent",
      weaponId: "agent_ct",
      paintkit: agents.agentCT,
      paintkitName: agents.agentCTName,
      imageUrl: agents.agentCTImage,
      rarity: "lendário",
      accent: rarityAccent("lendário"),
      floatValue: 0,
      seed: 0,
      stattrak: false,
      nametag: null,
      equippedT: false,
      equippedCT: true,
      equippedAt: new Date().toISOString(),
      stickersT: [],
      stickersCT: [],
    });
  }

  return {
    steamLinked: true,
    steamId: user.steamId,
    steamId2: steamId64ToSteam2(user.steamId) ?? null,
    items,
  };
}
