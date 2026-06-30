import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { purchaseStoreItem } from "@/lib/store/fulfill-purchase";
import { clearCart, getOrCreateCart } from "@/lib/store/cart-service";
import { checkoutDueDate } from "@/lib/store/checkout-constants";
import {
  formatCheckoutTotal,
  notifyCheckoutDelinquent,
  notifyCheckoutPaid,
  notifyCheckoutPending,
} from "@/lib/store/cart-notifications";
import { formatPriceCents } from "@/lib/serializers";
import type { GrantedStoreReward } from "@/lib/store/types";

export async function processCheckoutDelinquencyForUser(userId: string) {
  const now = new Date();
  const overdue = await prisma.storeCheckout.findMany({
    where: { userId, status: "PENDING", dueAt: { lt: now } },
  });

  for (const checkout of overdue) {
    await prisma.storeCheckout.update({
      where: { id: checkout.id },
      data: { status: "DELINQUENT", delinquentAt: now },
    });
    await notifyCheckoutDelinquent(userId, checkout.id, formatCheckoutTotal(checkout.totalCents));
  }
}

async function fulfillCheckout(checkoutId: string, userId: string) {
  const checkout = await prisma.storeCheckout.findUnique({
    where: { id: checkoutId },
    include: { items: true },
  });
  if (!checkout || checkout.userId !== userId) {
    throw new CsgoApiError("Pedido não encontrado.", 404);
  }

  const allGranted: GrantedStoreReward[] = [];

  for (const line of checkout.items) {
    const lineGranted: GrantedStoreReward[] = [];
    for (let i = 0; i < line.quantity; i += 1) {
      const result = await purchaseStoreItem(userId, line.storeItemId, {
        skipNotification: true,
      });
      lineGranted.push(...result.granted);
      allGranted.push(...result.granted);
    }
    await prisma.storeCheckoutItem.update({
      where: { id: line.id },
      data: { grantedRewards: lineGranted },
    });
  }

  await prisma.storeCheckout.update({
    where: { id: checkoutId },
    data: { status: "PAID", paidAt: new Date() },
  });

  await clearCart(userId);

  const itemCount = checkout.items.reduce((sum, row) => sum + row.quantity, 0);
  await notifyCheckoutPaid(userId, formatCheckoutTotal(checkout.totalCents), itemCount);

  return { checkoutId, granted: allGranted, itemCount };
}

export async function createCheckoutFromCart(userId: string) {
  await processCheckoutDelinquencyForUser(userId);

  const cart = await getOrCreateCart(userId);
  if (cart.items.length === 0) {
    throw new CsgoApiError("Carrinho vazio.", 400);
  }

  let totalCents = 0;
  const lineSnapshots: {
    storeItemId: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[] = [];

  for (const row of cart.items) {
    if (!row.storeItem.enabled || row.storeItem.rewards.length === 0) {
      throw new CsgoApiError(`"${row.storeItem.name}" não está disponível.`, 400);
    }
    const lineTotal = row.storeItem.priceCents * row.quantity;
    totalCents += lineTotal;
    lineSnapshots.push({
      storeItemId: row.storeItemId,
      quantity: row.quantity,
      unitPriceCents: row.storeItem.priceCents,
      lineTotalCents: lineTotal,
    });
  }

  const dueAt = checkoutDueDate();

  if (totalCents === 0) {
    const checkout = await prisma.storeCheckout.create({
      data: {
        userId,
        status: "PENDING",
        totalCents: 0,
        dueAt,
        items: { create: lineSnapshots },
      },
      include: { items: true },
    });
    const result = await fulfillCheckout(checkout.id, userId);
    return {
      ...result,
      status: "PAID" as const,
      totalCents: 0,
      total: formatPriceCents(0),
    };
  }

  const checkout = await prisma.storeCheckout.create({
    data: {
      userId,
      status: "PENDING",
      totalCents,
      dueAt,
      items: { create: lineSnapshots },
    },
  });

  await notifyCheckoutPending(userId, checkout.id, formatCheckoutTotal(totalCents), dueAt);

  return {
    checkoutId: checkout.id,
    status: "PENDING" as const,
    totalCents,
    total: formatCheckoutTotal(totalCents),
    dueAt: dueAt.toISOString(),
  };
}

export async function payCheckout(userId: string, checkoutId: string) {
  await processCheckoutDelinquencyForUser(userId);

  const checkout = await prisma.storeCheckout.findUnique({ where: { id: checkoutId } });
  if (!checkout || checkout.userId !== userId) {
    throw new CsgoApiError("Pedido não encontrado.", 404);
  }

  if (checkout.status === "PAID") {
    throw new CsgoApiError("Pedido já pago.", 409);
  }
  if (checkout.status === "CANCELLED") {
    throw new CsgoApiError("Pedido cancelado.", 400);
  }

  const result = await fulfillCheckout(checkoutId, userId);
  return {
    ...result,
    status: "PAID" as const,
    total: formatCheckoutTotal(checkout.totalCents),
  };
}

export async function cancelCheckout(userId: string, checkoutId: string) {
  const checkout = await prisma.storeCheckout.findUnique({ where: { id: checkoutId } });
  if (!checkout || checkout.userId !== userId) {
    throw new CsgoApiError("Pedido não encontrado.", 404);
  }
  if (checkout.status === "PAID") {
    throw new CsgoApiError("Pedido já pago — não pode cancelar.", 400);
  }

  await prisma.storeCheckout.update({
    where: { id: checkoutId },
    data: { status: "CANCELLED" },
  });

  return { ok: true };
}

export async function listUserCheckouts(userId: string) {
  await processCheckoutDelinquencyForUser(userId);

  const rows = await prisma.storeCheckout.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      items: {
        include: {
          storeItem: { select: { name: true, imageUrl: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    totalCents: row.totalCents,
    total: formatPriceCents(row.totalCents),
    dueAt: row.dueAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    delinquentAt: row.delinquentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    itemCount: row.items.reduce((sum, line) => sum + line.quantity, 0),
    items: row.items.map((line) => ({
      name: line.storeItem.name,
      quantity: line.quantity,
      imageUrl: line.storeItem.imageUrl,
    })),
  }));
}
