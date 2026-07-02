import type { SkinPreviewData } from "@/components/skins/skin-preview-modal";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { resolveCatalogSkinImageUrl } from "@/lib/inventory/skin-images";

export function catalogSkinToPreview(item: {
  id: string;
  name: string;
  imageUrl?: string | null;
  accent: string;
  category?: string;
  rarity: string;
  weaponName?: string;
  paintkitName?: string;
  equipped?: boolean;
  owned?: boolean;
  stattrak?: boolean;
}): SkinPreviewData {
  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    accent: item.accent,
    category: item.category,
    rarity: item.rarity,
    weaponName: item.weaponName,
    paintkitName: item.paintkitName,
    equipped: item.equipped,
    owned: item.owned,
    stattrak: item.stattrak,
  };
}

export function loadoutItemToPreview(item: {
  catalogSkinId: string;
  name: string;
  imageUrl: string | null;
  accent: string;
  rarity: string;
}): SkinPreviewData {
  return {
    id: item.catalogSkinId,
    name: item.name,
    imageUrl: item.imageUrl,
    accent: item.accent,
    rarity: item.rarity,
    equipped: true,
    owned: true,
  };
}

export function adminCatalogItemToPreview(item: {
  id: string;
  weaponName: string;
  paintkitName: string;
  weaponId?: string;
  paintkit?: number;
  rarity: string;
  category?: string;
  imageUrl: string | null;
}): SkinPreviewData {
  return {
    id: item.id,
    name: `${item.weaponName} | ${item.paintkitName}`,
    imageUrl: resolveCatalogSkinImageUrl(item.imageUrl, item.id),
    accent: rarityAccent(item.rarity),
    rarity: item.rarity,
    category: item.category,
    weaponName: item.weaponName,
    paintkitName: item.paintkitName,
  };
}

export function storeRewardToPreview(reward: {
  kind: string;
  catalogSkinId?: string | null;
  label: string | null;
  imageUrl: string | null;
  subLabel: string | null;
}): SkinPreviewData | null {
  if (reward.kind !== "CATALOG_SKIN" || !reward.catalogSkinId) return null;

  const parts = reward.label?.split(" | ") ?? [];
  return {
    id: reward.catalogSkinId,
    name: reward.label ?? "Skin",
    imageUrl: resolveCatalogSkinImageUrl(reward.imageUrl, reward.catalogSkinId),
    accent: rarityAccent(reward.subLabel ?? "common"),
    rarity: reward.subLabel ?? "common",
    weaponName: parts[0] ?? undefined,
    paintkitName: parts[1] ?? undefined,
  };
}

export function grantedSkinToPreview(item: {
  catalogSkinId: string;
  name: string;
  imageUrl: string | null;
  accent: string;
  category: string;
  rarity: string;
}): SkinPreviewData {
  return {
    id: item.catalogSkinId,
    name: item.name,
    imageUrl: item.imageUrl,
    accent: item.accent,
    category: item.category,
    rarity: item.rarity,
    owned: true,
  };
}
