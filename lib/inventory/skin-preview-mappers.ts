import type { SkinPreviewData } from "@/components/skins/skin-preview-modal";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";

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
    imageUrl: item.imageUrl ?? catalogSkinImageUrl(item.id),
    accent: rarityAccent(item.rarity),
    rarity: item.rarity,
    category: item.category,
    weaponName: item.weaponName,
    paintkitName: item.paintkitName,
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
