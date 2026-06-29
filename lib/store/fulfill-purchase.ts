import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import type { StoreItem, StoreItemReward } from "@/lib/generated/prisma/client";
import {
  grantCatalogSkinReward,
  grantStoreRewardRow,
  userOwnsCatalogSkin,
} from "@/lib/store/grant-reward";
import {
  pickWeightedStoreReward,
  pickWeightedStoreRewardExcluding,
} from "@/lib/store/case-roll";
import { notifyStorePurchaseCompleted } from "@/lib/store/store-notifications";
import type { GrantedStoreReward, StorePurchaseResult } from "@/lib/store/types";

type StoreItemWithRewards = StoreItem & { rewards: StoreItemReward[] };

async function countCompletedPurchases(userId: string, storeItemId: string): Promise<number> {
  return prisma.storePurchase.count({
    where: { userId, storeItemId, status: "COMPLETED" },
  });
}

async function validatePurchaseEligibility(
  userId: string,
  item: StoreItemWithRewards,
): Promise<void> {
  if (!item.enabled) {
    throw new CsgoApiError("Este item não está disponível na loja.", 400);
  }
  if (item.rewards.length === 0) {
    throw new CsgoApiError("Item da loja sem recompensas configuradas.", 400);
  }

  if (item.maxPerUser != null) {
    const count = await countCompletedPurchases(userId, item.id);
    if (count >= item.maxPerUser) {
      throw new CsgoApiError("Você atingiu o limite de compras deste item.", 409);
    }
  }

  if (item.productKind === "SKIN") {
    const skinReward = item.rewards.find((row) => row.kind === "CATALOG_SKIN" && row.catalogSkinId);
    if (!skinReward?.catalogSkinId) {
      throw new CsgoApiError("Skin da loja não configurada.", 400);
    }
    if (await userOwnsCatalogSkin(userId, skinReward.catalogSkinId)) {
      throw new CsgoApiError("Você já possui esta skin.", 409);
    }
  }
}

async function resolveCaseReward(
  userId: string,
  rewards: StoreItemReward[],
): Promise<StoreItemReward> {
  const skinRewards = rewards.filter((row) => row.kind === "CATALOG_SKIN" && row.catalogSkinId);
  if (skinRewards.length === 0) {
    throw new CsgoApiError("Caixa sem skins no pool.", 400);
  }

  const ownedIds = new Set<string>();
  for (const reward of skinRewards) {
    if (reward.catalogSkinId && (await userOwnsCatalogSkin(userId, reward.catalogSkinId))) {
      ownedIds.add(reward.id);
    }
  }

  const picked =
    ownedIds.size >= skinRewards.length
      ? pickWeightedStoreReward(skinRewards)
      : pickWeightedStoreRewardExcluding(skinRewards, ownedIds);

  if (!picked) {
    throw new CsgoApiError("Não foi possível sortear a caixa.", 500);
  }
  return picked;
}

async function fulfillRewardsForItem(
  userId: string,
  item: StoreItemWithRewards,
): Promise<GrantedStoreReward[]> {
  const granted: GrantedStoreReward[] = [];

  switch (item.productKind) {
    case "SKIN": {
      const reward = item.rewards.find((row) => row.kind === "CATALOG_SKIN" && row.catalogSkinId);
      if (!reward?.catalogSkinId) {
        throw new CsgoApiError("Skin da loja não configurada.", 400);
      }
      granted.push(await grantCatalogSkinReward(userId, reward.catalogSkinId, { notify: false }));
      break;
    }
    case "AGENT": {
      const reward = item.rewards.find((row) => row.kind === "AGENT" && row.agentDefIndex);
      if (!reward?.agentDefIndex) {
        throw new CsgoApiError("Agente da loja não configurado.", 400);
      }
      granted.push(await grantStoreRewardRow(userId, reward));
      break;
    }
    case "CASE": {
      const picked = await resolveCaseReward(userId, item.rewards);
      granted.push(await grantStoreRewardRow(userId, picked, { notifySkin: false }));
      break;
    }
    case "PACKAGE": {
      const sorted = [...item.rewards].sort((a, b) => a.sortOrder - b.sortOrder);
      for (const reward of sorted) {
        for (let i = 0; i < Math.max(1, reward.quantity); i += 1) {
          granted.push(await grantStoreRewardRow(userId, reward, { notifySkin: false }));
        }
      }
      break;
    }
    default: {
      const _exhaustive: never = item.productKind;
      throw new CsgoApiError(`Tipo de produto não suportado: ${_exhaustive}`, 400);
    }
  }

  return granted;
}

export async function purchaseStoreItem(
  userId: string,
  storeItemId: string,
): Promise<StorePurchaseResult> {
  const item = await prisma.storeItem.findUnique({
    where: { id: storeItemId },
    include: {
      rewards: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!item) {
    throw new CsgoApiError("Item não encontrado.", 404);
  }

  await validatePurchaseEligibility(userId, item);

  const granted = await fulfillRewardsForItem(userId, item);

  const purchase = await prisma.storePurchase.create({
    data: {
      userId,
      storeItemId: item.id,
      priceCents: item.priceCents,
      status: "COMPLETED",
      grantedRewards: granted,
    },
  });

  await notifyStorePurchaseCompleted(userId, item.name, item.productKind, granted);

  return {
    purchaseId: purchase.id,
    storeItemId: item.id,
    storeItemName: item.name,
    productKind: item.productKind,
    granted,
  };
}

export async function getUserStorePurchaseCounts(
  userId: string,
  storeItemIds: string[],
): Promise<Map<string, number>> {
  if (storeItemIds.length === 0) return new Map();

  const rows = await prisma.storePurchase.groupBy({
    by: ["storeItemId"],
    where: {
      userId,
      storeItemId: { in: storeItemIds },
      status: "COMPLETED",
    },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.storeItemId, row._count._all]));
}
