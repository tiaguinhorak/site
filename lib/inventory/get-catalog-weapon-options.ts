import "server-only";

import { prisma } from "@/lib/prisma";
import type { InventoryCategoryKey } from "@/lib/profile";

export type CatalogWeaponOption = {
  weaponId: string;
  weaponName: string;
};

export async function getCatalogWeaponOptions(
  category: InventoryCategoryKey | "all",
): Promise<CatalogWeaponOption[]> {
  const where = category !== "all" ? { category } : {};

  const rows = await prisma.csgoSkinCatalog.findMany({
    where,
    select: { weaponId: true, weaponName: true },
    distinct: ["weaponId"],
    orderBy: { weaponName: "asc" },
  });

  return rows.map((row) => ({
    weaponId: row.weaponId,
    weaponName: row.weaponName,
  }));
}
