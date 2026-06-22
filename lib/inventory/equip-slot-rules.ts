import type { PrismaClient } from "@/lib/generated/prisma/client";

type CatalogDb = Pick<PrismaClient, "csgoSkinCatalog">;

export function isMeleeWeaponId(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return id.includes("knife") || id.includes("bayonet");
}

export function isGlovesWeaponId(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return id.includes("gloves") || id.includes("handwraps");
}

/** Catalog skin ids to unequip when equipping a new skin in the same slot. */
export async function getCatalogIdsToUnequipOnEquip(
  db: CatalogDb,
  weaponId: string,
): Promise<string[]> {
  if (isMeleeWeaponId(weaponId)) {
    const rows = await db.csgoSkinCatalog.findMany({
      where: {
        OR: [
          { weaponId: { contains: "knife", mode: "insensitive" } },
          { weaponId: { contains: "bayonet", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  if (isGlovesWeaponId(weaponId)) {
    const rows = await db.csgoSkinCatalog.findMany({
      where: {
        OR: [
          { weaponId: { contains: "gloves", mode: "insensitive" } },
          { weaponId: { contains: "handwraps", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  const rows = await db.csgoSkinCatalog.findMany({
    where: { weaponId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
