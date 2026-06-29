import "server-only";

import type { Prisma, StoreItem, StoreItemReward } from "@/lib/generated/prisma/client";
import { formatPriceCents } from "@/lib/serializers";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import type { StoreRewardPreview } from "@/lib/store/types";

type StoreItemRow = StoreItem & {
  rewards?: (StoreItemReward & {
    catalogSkin?: {
      weaponName: string;
      paintkitName: string;
      imageUrl: string | null;
      category?: string;
      rarity?: string;
    } | null;
  })[];
};

export function rewardPreviewLabel(
  reward: StoreItemRow["rewards"] extends (infer R)[] | undefined ? R : never,
): { label: string | null; imageUrl: string | null } {
  if (!reward) return { label: null, imageUrl: null };

  if (reward.kind === "CATALOG_SKIN" && reward.catalogSkin) {
    return {
      label: `${reward.catalogSkin.weaponName} | ${reward.catalogSkin.paintkitName}`,
      imageUrl:
        reward.catalogSkin.imageUrl ??
        (reward.catalogSkinId ? catalogSkinImageUrl(reward.catalogSkinId) : null),
    };
  }

  if (reward.kind === "AGENT" && reward.agentDefIndex) {
    return {
      label: `Agente #${reward.agentDefIndex}`,
      imageUrl: null,
    };
  }

  return { label: null, imageUrl: null };
}

export function serializeStoreReward(
  reward: NonNullable<StoreItemRow["rewards"]>[number],
): StoreRewardPreview {
  const { label, imageUrl } = rewardPreviewLabel(reward);
  return {
    id: reward.id,
    kind: reward.kind,
    catalogSkinId: reward.catalogSkinId,
    agentDefIndex: reward.agentDefIndex,
    weight: reward.weight,
    quantity: reward.quantity,
    sortOrder: reward.sortOrder,
    label,
    imageUrl,
  };
}

export type PublicStoreItem = {
  id: string;
  name: string;
  type: string;
  productKind: StoreItem["productKind"];
  price: string;
  priceCents: number;
  originalPrice?: string;
  badge: string;
  description: string;
  accent: string;
  imageUrl: string | null;
  trending: boolean;
  featured: boolean;
  maxPerUser: number | null;
  purchaseCount: number;
  canPurchase: boolean;
  ownedSkin: boolean;
  rewardsPreview: StoreRewardPreview[];
};

export function serializePublicStoreItem(
  item: StoreItemRow,
  context: {
    purchaseCount: number;
    ownedSkinIds: Set<string>;
  },
): PublicStoreItem {
  const rewards = item.rewards ?? [];
  const skinReward = rewards.find((row) => row.kind === "CATALOG_SKIN" && row.catalogSkinId);
  const ownedSkin = skinReward?.catalogSkinId
    ? context.ownedSkinIds.has(skinReward.catalogSkinId)
    : false;

  const atLimit =
    item.maxPerUser != null && context.purchaseCount >= item.maxPerUser;
  const canPurchase =
    item.enabled &&
    rewards.length > 0 &&
    !atLimit &&
    !(item.productKind === "SKIN" && ownedSkin);

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    productKind: item.productKind,
    price: formatPriceCents(item.priceCents),
    priceCents: item.priceCents,
    originalPrice: item.originalCents ? formatPriceCents(item.originalCents) : undefined,
    badge: item.badge,
    description: item.description,
    accent: item.accent,
    imageUrl: item.imageUrl ?? null,
    trending: item.trending,
    featured: item.featured,
    maxPerUser: item.maxPerUser,
    purchaseCount: context.purchaseCount,
    canPurchase,
    ownedSkin,
    rewardsPreview: rewards.map(serializeStoreReward),
  };
}

export const storeItemWithRewardsInclude = {
  rewards: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      catalogSkin: {
        select: {
          weaponName: true,
          paintkitName: true,
          imageUrl: true,
          category: true,
          rarity: true,
        },
      },
    },
  },
} satisfies Prisma.StoreItemInclude;
