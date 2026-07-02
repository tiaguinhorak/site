import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { ensureInventoryItemForCatalogSkin } from "@/lib/inventory/inventory-ownership";
import { notifyInventorySkinGranted } from "@/lib/inventory/inventory-notifications";
import { invalidateUserCatalogAccess } from "@/lib/inventory/user-catalog-access-cache";
import { savePlayerAgentsForUser } from "@/lib/inventory/player-agents";
import { pushPlayerAgentsToGameServer } from "@/lib/inventory/push-agents-to-game-server";
import { resolveCatalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { lookupAgentFromApi } from "@/lib/inventory/csgo-api-agent-index";
import { lookupStickerFromApi } from "@/lib/inventory/csgo-api-sticker-index";
import type { StoreItemReward } from "@/lib/generated/prisma/client";
import type { GrantedStoreReward } from "@/lib/store/types";

function formatSkinName(weaponName: string, paintkitName: string): string {
  return `${weaponName} | ${paintkitName}`;
}

export async function userOwnsCatalogSkin(
  userId: string,
  catalogSkinId: string,
): Promise<boolean> {
  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { catalogSkinId },
    select: { id: true },
  });
  if (!inventoryItem) return false;

  const row = await prisma.userInventoryItem.findUnique({
    where: {
      userId_inventoryItemId: { userId, inventoryItemId: inventoryItem.id },
    },
    select: { owned: true },
  });
  return row?.owned === true;
}

export async function grantCatalogSkinReward(
  userId: string,
  catalogSkinId: string,
  options?: { notify?: boolean; fromStorePurchase?: boolean },
): Promise<GrantedStoreReward> {
  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: catalogSkinId },
  });
  if (!catalog) {
    throw new CsgoApiError("Skin não encontrada no catálogo.", 404);
  }
  if (!catalog.enabled && !options?.fromStorePurchase) {
    throw new CsgoApiError("Skin indisponível no catálogo.", 400);
  }

  const skinName = formatSkinName(catalog.weaponName, catalog.paintkitName);
  const alreadyOwned = await userOwnsCatalogSkin(userId, catalogSkinId);

  if (!alreadyOwned) {
    const inventoryItem = await ensureInventoryItemForCatalogSkin(catalogSkinId);
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
      update: { owned: true },
    });

    if (options?.notify !== false) {
      await notifyInventorySkinGranted(userId, skinName, catalogSkinId);
    }
    invalidateUserCatalogAccess(userId);
  }

  return {
    kind: "CATALOG_SKIN",
    catalogSkinId,
    name: skinName,
    imageUrl: resolveCatalogSkinImageUrl(catalog.imageUrl, catalog.id),
    alreadyOwned,
  };
}

export async function grantAgentReward(
  userId: string,
  agentDefIndex: number,
  options?: { fromStorePurchase?: boolean; grantSource?: string },
): Promise<GrantedStoreReward> {
  if (agentDefIndex <= 0) {
    throw new CsgoApiError("Agente inválido.", 400);
  }

  const catalog = await prisma.csgoAgentCatalog.findUnique({
    where: { defIndex: agentDefIndex },
  });
  if (catalog && !catalog.enabled && !options?.fromStorePurchase) {
    throw new CsgoApiError("Agente indisponível.", 400);
  }

  const apiMeta = catalog ? null : await lookupAgentFromApi(agentDefIndex);
  const name = catalog?.name ?? apiMeta?.name ?? `Agent ${agentDefIndex}`;
  const imageUrl = catalog?.imageUrl ?? apiMeta?.imageUrl ?? null;
  const team = (catalog?.team ?? apiMeta?.team ?? "T") as "T" | "CT";

  try {
    const { steamId } = await savePlayerAgentsForUser(userId, team, agentDefIndex);
    await pushPlayerAgentsToGameServer(steamId);
  } catch {
    // Steam não vinculada ou plano — compra registrada; equipar depois no inventário.
  }

  await prisma.userEconomyGrant.upsert({
    where: {
      userId_kind_defIndex: { userId, kind: "AGENT", defIndex: agentDefIndex },
    },
    create: {
      userId,
      kind: "AGENT",
      defIndex: agentDefIndex,
      source: options?.grantSource ?? "store",
    },
    update: {},
  });

  return {
    kind: "AGENT",
    agentDefIndex,
    name,
    imageUrl,
  };
}

export async function grantStickerReward(
  userId: string,
  stickerDefIndex: number,
  options?: { fromStorePurchase?: boolean; grantSource?: string },
): Promise<GrantedStoreReward> {
  void options?.fromStorePurchase;
  if (stickerDefIndex <= 0) {
    throw new CsgoApiError("Sticker inválido.", 400);
  }

  const catalog = await prisma.csgoStickerCatalog.findUnique({
    where: { defIndex: stickerDefIndex },
  });
  if (catalog && !catalog.enabled && !options?.fromStorePurchase) {
    throw new CsgoApiError("Sticker indisponível.", 400);
  }

  const apiMeta = catalog ? null : await lookupStickerFromApi(stickerDefIndex);
  const name = catalog?.name ?? apiMeta?.name ?? `Sticker ${stickerDefIndex}`;
  const imageUrl = catalog?.imageUrl ?? apiMeta?.imageUrl ?? null;

  await prisma.userEconomyGrant.upsert({
    where: {
      userId_kind_defIndex: { userId, kind: "STICKER", defIndex: stickerDefIndex },
    },
    create: {
      userId,
      kind: "STICKER",
      defIndex: stickerDefIndex,
      source: options?.grantSource ?? "store",
    },
    update: {},
  });

  return {
    kind: "STICKER",
    stickerDefIndex,
    name,
    imageUrl,
  };
}

export async function grantStoreRewardRow(
  userId: string,
  reward: StoreItemReward,
  options?: { notifySkin?: boolean; grantSource?: string },
): Promise<GrantedStoreReward> {
  const fromStorePurchase = true;
  const grantSource = options?.grantSource ?? "store";
  switch (reward.kind) {
    case "CATALOG_SKIN": {
      if (!reward.catalogSkinId) {
        throw new CsgoApiError("Recompensa de skin sem catálogo.", 500);
      }
      return grantCatalogSkinReward(userId, reward.catalogSkinId, {
        notify: options?.notifySkin,
        fromStorePurchase,
      });
    }
    case "AGENT": {
      if (!reward.agentDefIndex) {
        throw new CsgoApiError("Recompensa de agente inválida.", 500);
      }
      return grantAgentReward(userId, reward.agentDefIndex, { fromStorePurchase, grantSource });
    }
    case "STICKER": {
      if (!reward.stickerDefIndex) {
        throw new CsgoApiError("Recompensa de sticker inválida.", 500);
      }
      return grantStickerReward(userId, reward.stickerDefIndex, { fromStorePurchase, grantSource });
    }
    default: {
      const _exhaustive: never = reward.kind;
      throw new CsgoApiError(`Tipo de recompensa não suportado: ${_exhaustive}`, 500);
    }
  }
}
