import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes — steamId rarely changes

type Entry = { steamId: string; at: number };
const cache = new Map<string, Entry>();

export async function getUserSteamIdCached(userId: string): Promise<string> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.steamId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });
  if (!user) throw new CsgoApiError("Usuário não encontrado.", 404);
  if (!user.steamId) {
    throw new CsgoApiError("Vincule sua Steam no perfil.", 400);
  }
  cache.set(userId, { steamId: user.steamId, at: Date.now() });
  return user.steamId;
}

export function invalidateUserSteamIdCache(userId: string): void {
  cache.delete(userId);
}
