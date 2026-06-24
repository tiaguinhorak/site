import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { logAdminAction } from "@/lib/admin/audit";
import { getCatalogIdsToUnequipOnEquip } from "@/lib/inventory/equip-slot-rules";
import { unequipSlotForTeam } from "@/lib/inventory/loadout-equip-helpers";
import {
  ensureInventoryItemForCatalogSkin,
} from "@/lib/inventory/inventory-ownership";
import {
  notifyInventorySkinGranted,
  notifyInventorySkinRevoked,
} from "@/lib/inventory/inventory-notifications";
import { pushPlayerLoadoutToGameServer } from "@/lib/inventory/push-loadout-to-game-server";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import type { InventoryCategoryKey } from "@/lib/profile";

export type UserGrantedCatalogSkin = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  weaponName: string;
  paintkitName: string;
  category: InventoryCategoryKey;
  rarity: string;
  accent: string;
  imageUrl: string | null;
  inventoryItemId: string;
};

function formatSkinName(weaponName: string, paintkitName: string): string {
  return `${weaponName} | ${paintkitName}`;
}

export async function listUserGrantedCatalogSkins(userId: string): Promise<UserGrantedCatalogSkin[]> {
  const rows = await prisma.userInventoryItem.findMany({
    where: {
      userId,
      owned: true,
      inventoryItem: { catalogSkinId: { not: null } },
    },
    include: {
      inventoryItem: {
        include: { catalogSkin: true },
      },
    },
    orderBy: { inventoryItem: { name: "asc" } },
  });

  const items: UserGrantedCatalogSkin[] = [];
  for (const row of rows) {
    const catalogSkinId = row.inventoryItem.catalogSkinId;
    if (!catalogSkinId) continue;

    const catalog = row.inventoryItem.catalogSkin;
    if (catalog) {
      items.push({
        catalogSkinId,
        name: formatSkinName(catalog.weaponName, catalog.paintkitName),
        weaponId: catalog.weaponId,
        weaponName: catalog.weaponName,
        paintkitName: catalog.paintkitName,
        category: catalog.category as InventoryCategoryKey,
        rarity: catalog.rarity,
        accent: rarityAccent(catalog.rarity),
        imageUrl: catalog.imageUrl ?? catalogSkinImageUrl(catalog.id) ?? null,
        inventoryItemId: row.inventoryItemId,
      });
    } else {
      items.push({
        catalogSkinId,
        name: row.inventoryItem.name,
        weaponId: "",
        weaponName: row.inventoryItem.name,
        paintkitName: "",
        category: row.inventoryItem.category as InventoryCategoryKey,
        rarity: row.inventoryItem.rarity,
        accent: row.inventoryItem.accent,
        imageUrl: row.inventoryItem.imageUrl,
        inventoryItemId: row.inventoryItemId,
      });
    }
  }

  return items;
}

export async function grantCatalogSkinToUser(
  adminId: string,
  userId: string,
  catalogSkinId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true },
  });
  if (!user) {
    throw new CsgoApiError("Usuário não encontrado.", 404);
  }

  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: catalogSkinId },
  });
  if (!catalog) {
    throw new CsgoApiError("Skin não encontrada no catálogo.", 404);
  }
  if (!catalog.enabled) {
    throw new CsgoApiError("Skin desabilitada no catálogo — habilite antes de conceder.", 400);
  }

  const inventoryItem = await ensureInventoryItemForCatalogSkin(catalogSkinId);
  const skinName = formatSkinName(catalog.weaponName, catalog.paintkitName);

  const existingGrant = await prisma.userInventoryItem.findUnique({
    where: {
      userId_inventoryItemId: { userId, inventoryItemId: inventoryItem.id },
    },
    select: { owned: true },
  });
  if (existingGrant?.owned) {
    throw new CsgoApiError("O jogador já possui esta skin.", 409);
  }

  await prisma.userInventoryItem.upsert({
    where: {
      userId_inventoryItemId: { userId, inventoryItemId: inventoryItem.id },
    },
    create: {
      userId,
      inventoryItemId: inventoryItem.id,
      owned: true,
      equipped: false,
    },
    update: {
      owned: true,
    },
  });

  await notifyInventorySkinGranted(userId, skinName, catalogSkinId);

  await logAdminAction({
    adminId,
    action: "INVENTORY_GRANT",
    targetType: "user",
    targetId: userId,
    summary: `Concedida skin ${skinName} para ${user.nickname}`,
    metadata: { catalogSkinId, inventoryItemId: inventoryItem.id },
  });

  return {
    ok: true,
    catalogSkinId,
    name: skinName,
    userId,
  };
}

export async function revokeCatalogSkinFromUser(
  adminId: string,
  userId: string,
  catalogSkinId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, steamId: true },
  });
  if (!user) {
    throw new CsgoApiError("Usuário não encontrado.", 404);
  }

  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: catalogSkinId },
  });
  if (!catalog) {
    throw new CsgoApiError("Skin não encontrada no catálogo.", 404);
  }

  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { catalogSkinId },
  });
  if (!inventoryItem) {
    throw new CsgoApiError("Skin não vinculada ao inventário.", 404);
  }

  const skinName = formatSkinName(catalog.weaponName, catalog.paintkitName);

  await prisma.userInventoryItem.updateMany({
    where: { userId, inventoryItemId: inventoryItem.id },
    data: { owned: false, equipped: false },
  });

  if (user.steamId) {
    const catalogIdsForSlot = await getCatalogIdsToUnequipOnEquip(prisma, catalog.weaponId);
    await unequipSlotForTeam(prisma, user.steamId, catalogIdsForSlot, "T");
    await unequipSlotForTeam(prisma, user.steamId, catalogIdsForSlot, "CT");

    await prisma.csgoPlayerSkin.updateMany({
      where: { steamId: user.steamId, skinId: catalogSkinId },
      data: { equipped: false, equippedT: false, equippedCT: false },
    });

    await pushPlayerLoadoutToGameServer(user.steamId);
  }

  await notifyInventorySkinRevoked(userId, skinName);

  await logAdminAction({
    adminId,
    action: "INVENTORY_REVOKE",
    targetType: "user",
    targetId: userId,
    summary: `Removida skin ${skinName} de ${user.nickname}`,
    metadata: { catalogSkinId, inventoryItemId: inventoryItem.id },
  });

  return {
    ok: true,
    catalogSkinId,
    name: skinName,
    userId,
  };
}
