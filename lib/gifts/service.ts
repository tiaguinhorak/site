import "server-only";

import { prisma } from "@/lib/prisma";
import { creditCoins, debitCoins, InsufficientCoinsError } from "@/lib/economy/wallet";
import { resolveSteamId64 } from "@/lib/steam/friends";
import { purchaseStoreItem, type StorePurchaseCurrency } from "@/lib/store/fulfill-purchase";
import { CsgoApiError } from "@/lib/csgo-api/http";

export class GiftError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

export type GiftRecipientInput =
  | { type: "user"; value: string }
  | { type: "steam"; value: string };

export type ResolvedRecipient = {
  id: string;
  nickname: string;
};

/** Resolve a gift recipient from an internal user id or a Steam id/url/vanity. */
export async function resolveRecipient(
  input: GiftRecipientInput,
  senderId: string,
): Promise<ResolvedRecipient> {
  let user: { id: string; nickname: string } | null = null;

  if (input.type === "user") {
    user = await prisma.user.findUnique({
      where: { id: input.value },
      select: { id: true, nickname: true },
    });
  } else {
    const steamId = await resolveSteamId64(input.value);
    if (!steamId) {
      throw new GiftError("Não foi possível resolver esse perfil da Steam.", 400);
    }
    user = await prisma.user.findUnique({
      where: { steamId },
      select: { id: true, nickname: true },
    });
  }

  if (!user) {
    throw new GiftError("Destinatário não encontrado na plataforma.", 404);
  }
  if (user.id === senderId) {
    throw new GiftError("Você não pode presentear a si mesmo.", 400);
  }
  return user;
}

export async function giftCoins(
  senderId: string,
  recipient: ResolvedRecipient,
  amount: number,
): Promise<void> {
  const value = Math.floor(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new GiftError("Quantidade inválida.", 400);
  }

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { nickname: true },
  });

  await prisma.$transaction(async (tx) => {
    try {
      await debitCoins(tx, {
        userId: senderId,
        amount: value,
        kind: "GIFT_SENT",
        reason: `Presente para ${recipient.nickname}`,
        metadata: { recipientId: recipient.id },
      });
    } catch (err) {
      if (err instanceof InsufficientCoinsError) {
        throw new GiftError("Você não tem moedas suficientes.", 402);
      }
      throw err;
    }

    await creditCoins(tx, {
      userId: recipient.id,
      amount: value,
      kind: "GIFT_RECEIVED",
      reason: `Presente de ${sender?.nickname ?? "um jogador"}`,
      metadata: { senderId },
    });
  });

  await prisma.notification
    .create({
      data: {
        userId: recipient.id,
        type: "SOCIAL",
        title: "Você recebeu um presente!",
        body: `${sender?.nickname ?? "Um jogador"} te enviou ${value.toLocaleString("pt-BR")} moedas.`,
      },
    })
    .catch(() => undefined);
}

export async function giftStoreItem(
  senderId: string,
  recipient: ResolvedRecipient,
  storeItemId: string,
  currency: StorePurchaseCurrency,
): Promise<void> {
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { nickname: true },
  });

  try {
    await purchaseStoreItem(senderId, storeItemId, {
      currency,
      recipientUserId: recipient.id,
      skipNotification: true,
    });
  } catch (err) {
    if (err instanceof CsgoApiError) {
      throw new GiftError(err.message, err.status);
    }
    throw err;
  }

  await prisma.notification
    .create({
      data: {
        userId: recipient.id,
        type: "SOCIAL",
        title: "Você recebeu um presente!",
        body: `${sender?.nickname ?? "Um jogador"} te presenteou com um item da loja.`,
      },
    })
    .catch(() => undefined);
}
