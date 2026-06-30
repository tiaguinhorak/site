import "server-only";

import { prisma } from "@/lib/prisma";

type RewardInput = {
  kind: string;
  catalogSkinId?: string | null;
  agentDefIndex?: number | null;
  stickerDefIndex?: number | null;
};

function duplicateInList<T>(values: T[]): T | null {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

function skinLabel(
  catalogSkin: { weaponName: string; paintkitName: string } | null,
  catalogSkinId: string | null,
): string {
  if (catalogSkin) return `${catalogSkin.weaponName} | ${catalogSkin.paintkitName}`;
  return catalogSkinId ?? "Skin";
}

export async function validateStoreRewardDuplicates(
  storeItemId: string,
  rewards: RewardInput[],
): Promise<string | null> {
  const skinIds = rewards
    .filter((row) => row.kind === "CATALOG_SKIN" && row.catalogSkinId)
    .map((row) => row.catalogSkinId!);
  const agentIndexes = rewards
    .filter((row) => row.kind === "AGENT" && row.agentDefIndex)
    .map((row) => row.agentDefIndex!);
  const stickerIndexes = rewards
    .filter((row) => row.kind === "STICKER" && row.stickerDefIndex)
    .map((row) => row.stickerDefIndex!);

  const dupSkin = duplicateInList(skinIds);
  if (dupSkin) {
    return "A mesma skin não pode aparecer duas vezes neste item.";
  }

  const dupAgent = duplicateInList(agentIndexes);
  if (dupAgent) {
    return "O mesmo personagem não pode aparecer duas vezes neste item.";
  }

  const dupSticker = duplicateInList(stickerIndexes);
  if (dupSticker) {
    return "O mesmo sticker não pode aparecer duas vezes neste item.";
  }

  if (skinIds.length > 0) {
    const conflict = await prisma.storeItemReward.findFirst({
      where: {
        catalogSkinId: { in: skinIds },
        storeItemId: { not: storeItemId },
      },
      include: {
        storeItem: { select: { name: true } },
        catalogSkin: { select: { weaponName: true, paintkitName: true } },
      },
    });
    if (conflict) {
      const label = skinLabel(conflict.catalogSkin, conflict.catalogSkinId);
      return `A skin "${label}" já está na loja (item: ${conflict.storeItem.name}).`;
    }
  }

  if (agentIndexes.length > 0) {
    const conflict = await prisma.storeItemReward.findFirst({
      where: {
        agentDefIndex: { in: agentIndexes },
        storeItemId: { not: storeItemId },
      },
      include: {
        storeItem: { select: { name: true } },
      },
    });
    if (conflict) {
      return `Este personagem já está na loja (item: ${conflict.storeItem.name}).`;
    }
  }

  if (stickerIndexes.length > 0) {
    const conflict = await prisma.storeItemReward.findFirst({
      where: {
        stickerDefIndex: { in: stickerIndexes },
        storeItemId: { not: storeItemId },
      },
      include: {
        storeItem: { select: { name: true } },
      },
    });
    if (conflict) {
      return `Este sticker já está na loja (item: ${conflict.storeItem.name}).`;
    }
  }

  return null;
}
