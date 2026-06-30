import "server-only";

import type { Plan } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  notifyDiscordUserLinked,
  notifyDiscordUserUnlinked,
} from "@/lib/discord/notify-bot";

function planToClient(plan: Plan): "free" | "premium" | "elite" {
  switch (plan) {
    case "PREMIUM":
      return "premium";
    case "ELITE":
      return "elite";
    default:
      return "free";
  }
}

/** Notifica o bot para sincronizar cargos quando plano ou vínculo mudam. */
export async function notifyDiscordPlanSyncForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordUserId: true, plan: true },
  });

  if (!user?.discordUserId) return;

  await notifyDiscordUserLinked({
    discordUserId: user.discordUserId,
    plan: planToClient(user.plan),
  });
}

/** Remove cargos Discord ao desvincular (chamar antes de limpar discordUserId). */
export async function notifyDiscordUnlinkForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordUserId: true },
  });

  if (!user?.discordUserId) return null;

  await notifyDiscordUserUnlinked({ discordUserId: user.discordUserId });
  return user.discordUserId;
}
