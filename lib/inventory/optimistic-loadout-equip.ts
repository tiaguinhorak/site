import { mapCatalogCategoryToUi } from "@/lib/inventory/catalog-categories";
import type { EquipSide } from "@/lib/inventory/loadout-team";
import type { InventoryCategoryKey } from "@/lib/profile";

type LoadoutSticker = {
  slot: number;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

export type OptimisticLoadoutEntry = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  category?: InventoryCategoryKey;
  imageUrl: string | null;
  accent: string;
  rarity: string;
  equippedT: boolean;
  equippedCT: boolean;
  stickersT: LoadoutSticker[];
  stickersCT: LoadoutSticker[];
};

type EquipPatch = {
  catalogSkinId: string;
  weaponId: string;
  name: string;
  imageUrl: string | null;
  accent: string;
  rarity: string;
  category?: InventoryCategoryKey;
  side: EquipSide;
};

export function applyOptimisticEquipToLoadout(
  items: OptimisticLoadoutEntry[],
  patch: EquipPatch,
): OptimisticLoadoutEntry[] {
  const { catalogSkinId, weaponId, side } = patch;
  const category =
    patch.category ?? mapCatalogCategoryToUi(undefined, weaponId);

  let next = items.filter((item) => {
    if (item.weaponId !== weaponId) return true;
    if (side === "both") return false;
    if (side === "T" && item.equippedT && !item.equippedCT) return false;
    if (side === "CT" && item.equippedCT && !item.equippedT) return false;
    return true;
  });

  next = next.map((item) => {
    if (item.weaponId !== weaponId) return item;
    if (side === "T") return { ...item, equippedT: false };
    if (side === "CT") return { ...item, equippedCT: false };
    return item;
  });

  const existingIdx = next.findIndex((i) => i.catalogSkinId === catalogSkinId);
  if (existingIdx >= 0) {
    return next.map((item, idx) =>
      idx === existingIdx
        ? {
            ...item,
            name: patch.name,
            imageUrl: patch.imageUrl,
            accent: patch.accent,
            rarity: patch.rarity,
            category,
            equippedT: side === "T" || side === "both" ? true : item.equippedT,
            equippedCT: side === "CT" || side === "both" ? true : item.equippedCT,
          }
        : item,
    );
  }

  next.push({
    catalogSkinId,
    name: patch.name,
    weaponId,
    category,
    imageUrl: patch.imageUrl,
    accent: patch.accent,
    rarity: patch.rarity,
    equippedT: side === "T" || side === "both",
    equippedCT: side === "CT" || side === "both",
    stickersT: [],
    stickersCT: [],
  });

  return next;
}

export function applyOptimisticUnequipToLoadout(
  items: OptimisticLoadoutEntry[],
  catalogSkinId: string,
  side: EquipSide,
): OptimisticLoadoutEntry[] {
  return items
    .map((item) => {
      if (item.catalogSkinId !== catalogSkinId) return item;
      const equippedT = side === "both" || side === "T" ? false : item.equippedT;
      const equippedCT = side === "both" || side === "CT" ? false : item.equippedCT;
      if (!equippedT && !equippedCT) return null;
      return { ...item, equippedT, equippedCT };
    })
    .filter((item): item is OptimisticLoadoutEntry => item !== null);
}
