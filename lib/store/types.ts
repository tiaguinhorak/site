import type { StoreProductKind, StoreRewardKind } from "@/lib/generated/prisma/client";

export type GrantedStoreReward = {
  kind: StoreRewardKind;
  catalogSkinId?: string;
  agentDefIndex?: number;
  name: string;
  imageUrl?: string | null;
  alreadyOwned?: boolean;
};

export type StorePurchaseResult = {
  purchaseId: string;
  storeItemId: string;
  storeItemName: string;
  productKind: StoreProductKind;
  granted: GrantedStoreReward[];
};

export type StoreRewardPreview = {
  id: string;
  kind: StoreRewardKind;
  catalogSkinId: string | null;
  agentDefIndex: number | null;
  weight: number;
  quantity: number;
  sortOrder: number;
  label: string | null;
  imageUrl: string | null;
};
