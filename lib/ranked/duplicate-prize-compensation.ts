import "server-only";

import type { RankedSeasonPrize, RankedSeasonRewardType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getUserObtainedAgentDefIndexes,
  getUserObtainedStickerDefIndexes,
} from "@/lib/inventory/user-obtained-economy";
import { userOwnsCatalogSkin } from "@/lib/store/grant-reward";

/** Moedas creditadas quando o jogador já possui o item da premiação de temporada. */
export const DUPLICATE_SEASON_PRIZE_COINS = 2000;

export async function userAlreadyOwnsSeasonItemPrize(
  userId: string,
  prize: Pick<
    RankedSeasonPrize,
    "rewardType" | "catalogSkinId" | "agentDefIndex" | "stickerDefIndex"
  >,
): Promise<boolean> {
  switch (prize.rewardType) {
    case "COINS":
      return false;
    case "PIX":
      return false;
    case "CATALOG_SKIN":
      return prize.catalogSkinId
        ? userOwnsCatalogSkin(userId, prize.catalogSkinId)
        : false;
    case "AGENT":
      if (!prize.agentDefIndex || prize.agentDefIndex <= 0) return false;
      return (await getUserObtainedAgentDefIndexes(userId)).has(prize.agentDefIndex);
    case "STICKER":
      if (!prize.stickerDefIndex || prize.stickerDefIndex <= 0) return false;
      return (await getUserObtainedStickerDefIndexes(userId)).has(prize.stickerDefIndex);
    default: {
      const _never: never = prize.rewardType;
      void _never;
      return false;
    }
  }
}

export async function notifyDuplicateSeasonPrizeCompensation(
  userId: string,
  seasonName: string,
  position: number,
  itemLabel: string,
  coins = DUPLICATE_SEASON_PRIZE_COINS,
) {
  const formatted = coins.toLocaleString("pt-BR");
  await prisma.notification.create({
    data: {
      userId,
      title: "Prêmio convertido em moedas",
      body: `Você já possuía «${itemLabel}». Na premiação do ${position}º lugar da ${seasonName}, recebeu ${formatted} moedas no lugar.`,
      type: "SYSTEM",
      params: {
        seasonName,
        position,
        itemLabel,
        compensationCoins: coins,
        duplicate: true,
        action: "ranking",
      },
    },
  });
}

export function seasonRewardTypeLabel(rewardType: RankedSeasonRewardType): string {
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
