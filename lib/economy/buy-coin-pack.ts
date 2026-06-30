import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { creditCoins } from "@/lib/economy/wallet";
import { getCoinPack, totalCoinsInPack } from "@/lib/economy/coin-packs";
import { checkoutDueDate } from "@/lib/store/checkout-constants";
import { formatPriceCents } from "@/lib/serializers";

export async function createCoinPackCheckout(userId: string, packId: string) {
  const pack = getCoinPack(packId);
  if (!pack) {
    throw new CsgoApiError("Pacote de moedas inválido.", 400);
  }

  const dueAt = checkoutDueDate();
  const totalCoins = totalCoinsInPack(pack);

  const checkout = await prisma.coinPackCheckout.create({
    data: {
      userId,
      packId: pack.id,
      coins: totalCoins,
      priceCents: pack.priceCents,
      status: "PENDING",
      dueAt,
    },
  });

  return {
    checkoutId: checkout.id,
    packId: pack.id,
    coins: totalCoins,
    priceCents: pack.priceCents,
    price: formatPriceCents(pack.priceCents),
    dueAt: dueAt.toISOString(),
    status: "PENDING" as const,
  };
}

export async function payCoinPackCheckout(userId: string, checkoutId: string) {
  const checkout = await prisma.coinPackCheckout.findUnique({ where: { id: checkoutId } });
  if (!checkout || checkout.userId !== userId) {
    throw new CsgoApiError("Pedido não encontrado.", 404);
  }
  if (checkout.status === "PAID") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    return { ok: true, alreadyPaid: true, balance: user?.coins ?? 0, coinsAdded: 0 };
  }
  if (checkout.status !== "PENDING") {
    throw new CsgoApiError("Este pedido não pode ser pago.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.coinPackCheckout.update({
      where: { id: checkoutId },
      data: { status: "PAID", paidAt: new Date() },
    });

    return creditCoins(tx, {
      userId,
      amount: checkout.coins,
      kind: "COIN_TOPUP",
      reason: `Pacote ${checkout.packId}`,
      metadata: { checkoutId, packId: checkout.packId },
    });
  });

  return {
    ok: true,
    alreadyPaid: false,
    balance: result.balance,
    coinsAdded: result.amount,
  };
}
