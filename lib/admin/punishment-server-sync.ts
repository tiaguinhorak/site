import "server-only";

import { prisma } from "@/lib/prisma";
import {
  banPlayerOnGameServers,
  punishmentDurationToBanMinutes,
  unbanPlayerOnGameServers,
} from "@/lib/csgo-api/player-ban-sync";

export async function syncGameBanForPunishment(params: {
  userId: string;
  reason: string;
  expiresAt: Date | null;
}): Promise<{ attempted: boolean; ok: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { steamId: true },
  });

  if (!user?.steamId) {
    return { attempted: false, ok: false, error: "Usuário sem Steam vinculado." };
  }

  const minutes = punishmentDurationToBanMinutes(params.expiresAt);
  const result = await banPlayerOnGameServers({
    steamId: user.steamId,
    minutes,
    reason: params.reason,
  });

  return { attempted: true, ok: result.ok, error: result.error };
}

export async function syncGameUnbanForUser(userId: string): Promise<{
  attempted: boolean;
  ok: boolean;
  error?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });

  if (!user?.steamId) {
    return { attempted: false, ok: false, error: "Usuário sem Steam vinculado." };
  }

  const result = await unbanPlayerOnGameServers(user.steamId);
  return { attempted: true, ok: result.ok, error: result.error };
}
