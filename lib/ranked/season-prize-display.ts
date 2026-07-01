import "server-only";

import { prisma } from "@/lib/prisma";
import { pixPrizeLabel } from "@/lib/ranked/pix-prize";
import type { RankedSeasonPrize, RankedSeasonRewardType } from "@/lib/generated/prisma/client";

export type PublicSeasonPrizeDisplay = {
  id: string;
  position: number;
  sortOrder: number;
  rewardType: RankedSeasonRewardType;
  label: string;
  displayName: string;
  imageUrl: string | null;
  amountCoins: number;
  pixAmountCents: number;
  description?: string | null;
  highlight: boolean;
};

function rewardTypeLabel(rewardType: RankedSeasonRewardType): string {
  switch (rewardType) {
    case "COINS":
      return "Moedas";
    case "PIX":
      return "Pix";
    case "CATALOG_SKIN":
      return "Skin";
    case "AGENT":
      return "Agente";
    case "STICKER":
      return "Sticker";
    default: {
      const _never: never = rewardType;
      return _never;
    }
  }
}

function prizeDisplayName(
  catalogName: string | undefined,
  label: string,
  fallback: string,
): string {
  if (catalogName) return catalogName;
  if (label.trim()) return label;
  return fallback;
}

export type CatalogPreviewImageMaps = {
  skins: Map<string, string | null>;
  agents: Map<number, string | null>;
  stickers: Map<number, string | null>;
};

export async function fetchCatalogPreviewImageMaps(params: {
  catalogSkinIds: string[];
  agentDefIndexes: number[];
  stickerDefIndexes: number[];
}): Promise<CatalogPreviewImageMaps> {
  const skinIds = [...new Set(params.catalogSkinIds.filter(Boolean))];
  const agentIndexes = [...new Set(params.agentDefIndexes.filter((v) => v > 0))];
  const stickerIndexes = [...new Set(params.stickerDefIndexes.filter((v) => v > 0))];

  const [skins, agents, stickers] = await Promise.all([
    skinIds.length
      ? prisma.csgoSkinCatalog.findMany({
          where: { id: { in: skinIds } },
          select: { id: true, imageUrl: true },
        })
      : [],
    agentIndexes.length
      ? prisma.csgoAgentCatalog.findMany({
          where: { defIndex: { in: agentIndexes } },
          select: { defIndex: true, imageUrl: true },
        })
      : [],
    stickerIndexes.length
      ? prisma.csgoStickerCatalog.findMany({
          where: { defIndex: { in: stickerIndexes } },
          select: { defIndex: true, imageUrl: true },
        })
      : [],
  ]);

  return {
    skins: new Map(skins.map((skin) => [skin.id, skin.imageUrl])),
    agents: new Map(agents.map((agent) => [agent.defIndex, agent.imageUrl])),
    stickers: new Map(stickers.map((sticker) => [sticker.defIndex, sticker.imageUrl])),
  };
}

export async function resolvePublicSeasonPrizes(
  prizes: RankedSeasonPrize[],
): Promise<PublicSeasonPrizeDisplay[]> {
  const enabled = prizes
    .filter((prize) => prize.enabled)
    .sort(
      (a, b) =>
        a.position - b.position ||
        Number(b.highlight) - Number(a.highlight) ||
        a.sortOrder - b.sortOrder ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );

  if (enabled.length === 0) return [];

  const skinIds = [
    ...new Set(enabled.map((p) => p.catalogSkinId).filter((id): id is string => Boolean(id))),
  ];
  const agentIndexes = [
    ...new Set(enabled.map((p) => p.agentDefIndex).filter((v): v is number => v != null && v > 0)),
  ];
  const stickerIndexes = [
    ...new Set(enabled.map((p) => p.stickerDefIndex).filter((v): v is number => v != null && v > 0)),
  ];

  const [skins, agents, stickers] = await Promise.all([
    skinIds.length
      ? prisma.csgoSkinCatalog.findMany({
          where: { id: { in: skinIds } },
          select: {
            id: true,
            weaponName: true,
            paintkitName: true,
            imageUrl: true,
          },
        })
      : [],
    agentIndexes.length
      ? prisma.csgoAgentCatalog.findMany({
          where: { defIndex: { in: agentIndexes } },
          select: { defIndex: true, name: true, imageUrl: true },
        })
      : [],
    stickerIndexes.length
      ? prisma.csgoStickerCatalog.findMany({
          where: { defIndex: { in: stickerIndexes } },
          select: { defIndex: true, name: true, imageUrl: true },
        })
      : [],
  ]);

  const skinById = new Map(skins.map((skin) => [skin.id, skin]));
  const agentByDef = new Map(agents.map((agent) => [agent.defIndex, agent]));
  const stickerByDef = new Map(stickers.map((sticker) => [sticker.defIndex, sticker]));

  return enabled.map((prize) => {
    const typeLabel = rewardTypeLabel(prize.rewardType);

    if (prize.rewardType === "COINS") {
      const amount = prize.amountCoins.toLocaleString("pt-BR");
      return {
        id: prize.id,
        position: prize.position,
        sortOrder: prize.sortOrder,
        rewardType: prize.rewardType,
        label: prize.label,
        displayName: `${amount} moedas`,
        imageUrl: null,
        amountCoins: prize.amountCoins,
        pixAmountCents: 0,
        highlight: prize.highlight,
      };
    }

    if (prize.rewardType === "PIX") {
      return {
        id: prize.id,
        position: prize.position,
        sortOrder: prize.sortOrder,
        rewardType: prize.rewardType,
        label: prize.label,
        displayName: pixPrizeLabel(prize.pixAmountCents),
        imageUrl: null,
        amountCoins: 0,
        pixAmountCents: prize.pixAmountCents,
        description: null,
        highlight: prize.highlight,
      };
    }

    if (prize.rewardType === "CATALOG_SKIN" && prize.catalogSkinId) {
      const skin = skinById.get(prize.catalogSkinId);
      return {
        id: prize.id,
        position: prize.position,
        sortOrder: prize.sortOrder,
        rewardType: prize.rewardType,
        label: prize.label,
        displayName: skin
          ? `${skin.weaponName} | ${skin.paintkitName}`
          : prizeDisplayName(undefined, prize.label, typeLabel),
        imageUrl: skin?.imageUrl ?? null,
        amountCoins: 0,
        pixAmountCents: 0,
        highlight: prize.highlight,
      };
    }

    if (prize.rewardType === "AGENT" && prize.agentDefIndex) {
      const agent = agentByDef.get(prize.agentDefIndex);
      return {
        id: prize.id,
        position: prize.position,
        sortOrder: prize.sortOrder,
        rewardType: prize.rewardType,
        label: prize.label,
        displayName: prizeDisplayName(
          agent?.name,
          prize.label,
          `Agente #${prize.agentDefIndex}`,
        ),
        imageUrl: agent?.imageUrl ?? null,
        amountCoins: 0,
        pixAmountCents: 0,
        highlight: prize.highlight,
      };
    }

    if (prize.rewardType === "STICKER" && prize.stickerDefIndex) {
      const sticker = stickerByDef.get(prize.stickerDefIndex);
      return {
        id: prize.id,
        position: prize.position,
        sortOrder: prize.sortOrder,
        rewardType: prize.rewardType,
        label: prize.label,
        displayName: prizeDisplayName(
          sticker?.name,
          prize.label,
          `Sticker #${prize.stickerDefIndex}`,
        ),
        imageUrl: sticker?.imageUrl ?? null,
        amountCoins: 0,
        pixAmountCents: 0,
        highlight: prize.highlight,
      };
    }

    return {
      id: prize.id,
      position: prize.position,
      sortOrder: prize.sortOrder,
      rewardType: prize.rewardType,
      label: prize.label,
      displayName: prizeDisplayName(undefined, prize.label, typeLabel),
      imageUrl: null,
      amountCoins: prize.amountCoins,
      pixAmountCents: prize.pixAmountCents,
      highlight: prize.highlight,
    };
  });
}

export async function getPublicSeasonPrizesBySeasonIds(
  seasonIds: string[],
): Promise<Record<string, PublicSeasonPrizeDisplay[]>> {
  if (seasonIds.length === 0) return {};

  const prizes = await prisma.rankedSeasonPrize.findMany({
    where: { seasonId: { in: seasonIds }, enabled: true },
    orderBy: [{ position: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const bySeason = new Map<string, RankedSeasonPrize[]>();
  for (const prize of prizes) {
    const list = bySeason.get(prize.seasonId) ?? [];
    list.push(prize);
    bySeason.set(prize.seasonId, list);
  }

  const result: Record<string, PublicSeasonPrizeDisplay[]> = {};
  await Promise.all(
    [...bySeason.entries()].map(async ([seasonId, seasonPrizes]) => {
      result[seasonId] = await resolvePublicSeasonPrizes(seasonPrizes);
    }),
  );

  return result;
}

export async function getPublicSeasonPrizes(seasonId: string): Promise<PublicSeasonPrizeDisplay[]> {
  const prizes = await prisma.rankedSeasonPrize.findMany({
    where: { seasonId, enabled: true },
    orderBy: [{ position: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return resolvePublicSeasonPrizes(prizes);
}
