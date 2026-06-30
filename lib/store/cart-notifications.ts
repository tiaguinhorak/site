import "server-only";

import { prisma } from "@/lib/prisma";
import type { StoreProductKind } from "@/lib/generated/prisma/client";
import { formatPriceCents } from "@/lib/serializers";

async function shouldSendPromoNotification(userId: string): Promise<boolean> {
  const pref = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
    select: { inAppPromo: true },
  });
  if (!pref) return true;
  return pref.inAppPromo;
}

export async function notifyCartItemAdded(
  userId: string,
  itemName: string,
  quantity: number,
) {
  if (!(await shouldSendPromoNotification(userId))) return;

  await prisma.notification.create({
    data: {
      userId,
      title: "Item no carrinho",
      body: `${quantity > 1 ? `${quantity}× ` : ""}${itemName} foi adicionado ao carrinho.`,
      titleKey: "store.cart.itemAdded.title",
      bodyKey: "store.cart.itemAdded.body",
      params: { itemName, quantity, action: "cart" },
      type: "PROMO",
    },
  });
}

export async function notifyCheckoutPending(
  userId: string,
  checkoutId: string,
  totalFormatted: string,
  dueAt: Date,
) {
  if (!(await shouldSendPromoNotification(userId))) return;

  await prisma.notification.create({
    data: {
      userId,
      title: "Pagamento pendente",
      body: `Pedido de ${totalFormatted} aguardando pagamento até ${dueAt.toLocaleDateString("pt-BR")}.`,
      titleKey: "store.checkout.pending.title",
      bodyKey: "store.checkout.pending.body",
      params: {
        checkoutId,
        totalFormatted,
        dueDate: dueAt.toLocaleDateString("pt-BR"),
        action: "checkout",
      },
      type: "PROMO",
    },
  });
}

export async function notifyCheckoutDelinquent(
  userId: string,
  checkoutId: string,
  totalFormatted: string,
) {
  if (!(await shouldSendPromoNotification(userId))) return;

  await prisma.notification.create({
    data: {
      userId,
      title: "Pedido inadimplente",
      body: `O pagamento de ${totalFormatted} está em atraso. Regularize para receber seus itens.`,
      titleKey: "store.checkout.delinquent.title",
      bodyKey: "store.checkout.delinquent.body",
      params: { checkoutId, totalFormatted, action: "checkout" },
      type: "PROMO",
    },
  });
}

export async function notifyCheckoutPaid(
  userId: string,
  totalFormatted: string,
  itemCount: number,
) {
  if (!(await shouldSendPromoNotification(userId))) return;

  await prisma.notification.create({
    data: {
      userId,
      title: "Compra confirmada",
      body: `Pagamento de ${totalFormatted} confirmado. ${itemCount} item(ns) liberado(s) no inventário.`,
      titleKey: "store.checkout.paid.title",
      bodyKey: "store.checkout.paid.body",
      params: { totalFormatted, itemCount, action: "store" },
      type: "PROMO",
    },
  });
}

export async function notifyCartAbandoned(userId: string, itemCount: number) {
  if (!(await shouldSendPromoNotification(userId))) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.notification.findFirst({
    where: {
      userId,
      titleKey: "store.cart.abandoned.title",
      createdAt: { gte: since },
    },
  });
  if (recent) return;

  await prisma.notification.create({
    data: {
      userId,
      title: "Carrinho esperando",
      body: `Você tem ${itemCount} item(ns) no carrinho. Finalize a compra antes que expire.`,
      titleKey: "store.cart.abandoned.title",
      bodyKey: "store.cart.abandoned.body",
      params: { itemCount, action: "cart" },
      type: "PROMO",
    },
  });
}

export function formatCheckoutTotal(cents: number): string {
  return formatPriceCents(cents);
}

export type { StoreProductKind };
