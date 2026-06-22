import "server-only";

import { prisma } from "@/lib/prisma";

function isDemoOwnAllEnabled(): boolean {
  const flag = process.env.INVENTORY_DEMO_OWN_ALL?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/** Dev: marca todos os itens do catálogo legado como owned (sem sync de API). */
export async function ensureDemoInventoryOwned(userId: string): Promise<void> {
  if (!isDemoOwnAllEnabled()) return;

  const catalog = await prisma.inventoryItem.findMany({ select: { id: true } });
  if (!catalog.length) return;

  const existing = await prisma.userInventoryItem.findMany({
    where: { userId },
    select: { inventoryItemId: true },
  });
  const existingIds = new Set(existing.map((row) => row.inventoryItemId));

  const toCreate = catalog.filter((item) => !existingIds.has(item.id));
  if (toCreate.length) {
    await prisma.userInventoryItem.createMany({
      data: toCreate.map((item) => ({
        userId,
        inventoryItemId: item.id,
        owned: true,
        equipped: false,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.userInventoryItem.updateMany({
    where: { userId, owned: false },
    data: { owned: true },
  });
}
