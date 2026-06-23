import "server-only";

import { prisma } from "@/lib/prisma";

async function shouldSendSystemNotification(userId: string): Promise<boolean> {
  const pref = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
    select: { inAppSystem: true },
  });
  if (!pref) return true;
  return pref.inAppSystem;
}

export async function notifyInventorySkinGranted(
  userId: string,
  skinName: string,
  catalogSkinId: string,
) {
  if (!(await shouldSendSystemNotification(userId))) {
    return;
  }

  await prisma.notification.create({
    data: {
      userId,
      title: "Nova skin no inventário",
      body: `Você recebeu: ${skinName}. Equipe no inventário para usar no servidor.`,
      titleKey: "inventory.grant.title",
      bodyKey: "inventory.grant.body",
      params: { skinName, catalogSkinId, action: "inventory" },
      type: "SYSTEM",
    },
  });
}

export async function notifyInventorySkinRevoked(userId: string, skinName: string) {
  if (!(await shouldSendSystemNotification(userId))) {
    return;
  }

  await prisma.notification.create({
    data: {
      userId,
      title: "Skin removida",
      body: `${skinName} foi removida do seu inventário.`,
      titleKey: "inventory.revoke.title",
      bodyKey: "inventory.revoke.body",
      params: { skinName, action: "inventory" },
      type: "SYSTEM",
    },
  });
}
