import type { EquipSide } from "@/lib/inventory/loadout-team";

type CatalogItem = {
  id: string;
  weaponId: string;
  equippedT: boolean;
  equippedCT: boolean;
  equipped: boolean;
};

export function applyOptimisticEquipToCatalog<T extends CatalogItem>(
  items: T[],
  catalogSkinId: string,
  weaponId: string,
  side: EquipSide,
): T[] {
  return items.map((item) => {
    if (item.weaponId !== weaponId) return item;

    const isTarget = item.id === catalogSkinId;
    let equippedT = item.equippedT;
    let equippedCT = item.equippedCT;

    if (side === "both") {
      equippedT = isTarget;
      equippedCT = isTarget;
    } else if (side === "T") {
      equippedT = isTarget;
      if (!isTarget && item.equippedT) equippedT = false;
    } else {
      equippedCT = isTarget;
      if (!isTarget && item.equippedCT) equippedCT = false;
    }

    return {
      ...item,
      equippedT,
      equippedCT,
      equipped: equippedT || equippedCT,
    };
  });
}

export function applyOptimisticUnequipToCatalog<T extends CatalogItem>(
  items: T[],
  catalogSkinId: string,
  side: EquipSide,
): T[] {
  return items.map((item) => {
    if (item.id !== catalogSkinId) return item;

    let equippedT = item.equippedT;
    let equippedCT = item.equippedCT;

    if (side === "both") {
      equippedT = false;
      equippedCT = false;
    } else if (side === "T") {
      equippedT = false;
    } else {
      equippedCT = false;
    }

    return {
      ...item,
      equippedT,
      equippedCT,
      equipped: equippedT || equippedCT,
    };
  });
}
