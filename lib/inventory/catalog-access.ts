import "server-only";

import { prisma } from "@/lib/prisma";

function isTruthyEnvFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/** Env flag — does not grant access alone; paired with admin check. */
export function isAllSkinsEnvEnabled(): boolean {
  return isTruthyEnvFlag(process.env.INVENTORY_ALL_SKINS);
}

/** Legacy alias — prefer `canUserAccessAllCatalogSkins` for runtime checks. */
export function isAllSkinsEquipEnabled(): boolean {
  return isAllSkinsEnvEnabled();
}

/** Full catalog equip/list only for admins when INVENTORY_ALL_SKINS is set. */
export async function canUserAccessAllCatalogSkins(userId: string): Promise<boolean> {
  if (!isAllSkinsEnvEnabled()) {
    return false;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin === true;
}
