import "server-only";

import { prisma } from "@/lib/prisma";

export async function notifyGifModerationResult(
  userId: string,
  approved: boolean,
): Promise<void> {
  await notifyProfileMediaModeration(userId, approved, "avatar");
}

export async function notifyBannerModerationResult(
  userId: string,
  approved: boolean,
): Promise<void> {
  await notifyProfileMediaModeration(userId, approved, "banner");
}

async function notifyProfileMediaModeration(
  userId: string,
  approved: boolean,
  kind: "avatar" | "banner",
): Promise<void> {
  const pref = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
    select: { inAppSystem: true },
  });
  if (pref && !pref.inAppSystem) return;

  const keys =
    kind === "avatar"
      ? {
          titleKey: approved ? "profile.gifApproved.title" : "profile.gifRejected.title",
          bodyKey: approved ? "profile.gifApproved.body" : "profile.gifRejected.body",
          title: approved ? "Avatar GIF aprovado" : "Avatar GIF rejeitado",
          body: approved
            ? "Seu avatar animado foi aprovado e já está visível no perfil público."
            : "Seu GIF não foi aprovado pela moderação. Envie outro arquivo seguindo as regras.",
        }
      : {
          titleKey: approved ? "profile.bannerApproved.title" : "profile.bannerRejected.title",
          bodyKey: approved ? "profile.bannerApproved.body" : "profile.bannerRejected.body",
          title: approved ? "Banner GIF aprovado" : "Banner GIF rejeitado",
          body: approved
            ? "Seu banner animado foi aprovado e já está visível no perfil público."
            : "Seu banner GIF não foi aprovado. Envie outro arquivo seguindo as regras.",
        };

  await prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      titleKey: keys.titleKey,
      bodyKey: keys.bodyKey,
      title: keys.title,
      body: keys.body,
      params: { action: "profile" },
    },
  });
}
