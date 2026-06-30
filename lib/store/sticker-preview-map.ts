import "server-only";

import { prisma } from "@/lib/prisma";

export type StickerPreviewMeta = {
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

export function collectStickerDefIndexesFromStoreItems(
  items: { rewards?: { kind: string; stickerDefIndex: number | null }[] }[],
): number[] {
  const set = new Set<number>();
  for (const item of items) {
    for (const reward of item.rewards ?? []) {
      if (reward.kind === "STICKER" && reward.stickerDefIndex) {
        set.add(reward.stickerDefIndex);
      }
    }
  }
  return [...set];
}

export async function loadStickerPreviewMap(
  defIndexes: number[],
): Promise<Map<number, StickerPreviewMeta>> {
  const map = new Map<number, StickerPreviewMeta>();
  if (defIndexes.length === 0) return map;

  const rows = await prisma.csgoStickerCatalog.findMany({
    where: { defIndex: { in: defIndexes } },
    select: { defIndex: true, name: true, imageUrl: true },
  });

  for (const row of rows) {
    map.set(row.defIndex, {
      defIndex: row.defIndex,
      name: row.name,
      imageUrl: row.imageUrl,
    });
  }

  return map;
}
