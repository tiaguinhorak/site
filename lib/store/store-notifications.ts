import "server-only";

import { prisma } from "@/lib/prisma";
import type { StoreProductKind } from "@/lib/generated/prisma/client";
import type { GrantedStoreReward } from "@/lib/store/types";

async function shouldSendPromoNotification(userId: string): Promise<boolean> {
  const pref = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
    select: { inAppPromo: true },
  });
  if (!pref) return true;
  return pref.inAppPromo;
}

function summarizeGrantedRewards(granted: GrantedStoreReward[]): string {
  const names = granted.map((row) => row.name).filter(Boolean);
  if (names.length === 0) return "Itens liberados no inventário.";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names[0]} e mais ${names.length - 1} item(ns)`;
}

export async function notifyStorePurchaseCompleted(
  userId: string,
  storeItemName: string,
  productKind: StoreProductKind,
  granted: GrantedStoreReward[],
) {
  if (!(await shouldSendPromoNotification(userId))) {
    return;
  }

  const summary = summarizeGrantedRewards(granted);
  const isCase = productKind === "CASE";

  await prisma.notification.create({
    data: {
      userId,
      title: isCase ? "Caixa aberta!" : "Compra concluída",
      body: isCase
        ? `Você abriu ${storeItemName} e recebeu: ${summary}. Equipe no inventário.`
        : `Compra de ${storeItemName} concluída. Você recebeu: ${summary}.`,
      titleKey: isCase ? "store.caseOpened.title" : "store.purchase.title",
      bodyKey: isCase ? "store.caseOpened.body" : "store.purchase.body",
      params: {
        storeItemName,
        productKind,
        summary,
        action: "store",
        grantedCount: granted.length,
      },
      type: "PROMO",
    },
  });
}
