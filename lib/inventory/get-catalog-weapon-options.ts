import "server-only";

import { prisma } from "@/lib/prisma";
import type { InventoryCategoryKey } from "@/lib/profile";

export type CatalogWeaponOption = {
  weaponId: string;
  weaponName: string;
};

const WEAPON_OPTIONS_CACHE_MS = 10 * 60 * 1000;
const weaponOptionsCache = new Map<
  InventoryCategoryKey | "all",
  { at: number; options: CatalogWeaponOption[] }
>();

export async function getCatalogWeaponOptions(
  category: InventoryCategoryKey | "all",
): Promise<CatalogWeaponOption[]> {
  const cached = weaponOptionsCache.get(category);
  const now = Date.now();
  if (cached && now - cached.at < WEAPON_OPTIONS_CACHE_MS) {
    return cached.options;
  }

  const where = category !== "all" ? { category } : {};

  const rows = await prisma.csgoSkinCatalog.findMany({
    where,
    select: { weaponId: true, weaponName: true },
    distinct: ["weaponId"],
    orderBy: { weaponName: "asc" },
  });

  const options = rows.map((row) => ({
    weaponId: row.weaponId,
    weaponName: row.weaponName,
  }));

  weaponOptionsCache.set(category, { at: now, options });
  return options;
}
