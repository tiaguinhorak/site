import { prisma } from "@/lib/prisma";
import { sanitizeNickname } from "@/lib/security/sanitize";

export function steamPersonaToNickname(personaName: string): string {
  const cleaned = personaName.replace(/[^a-zA-Z0-9_]/g, "");
  const nick = sanitizeNickname(cleaned);
  if (nick.length >= 3) return nick;
  return sanitizeNickname("PLAYER");
}

async function isNicknameTaken(
  nickname: string,
  exceptUserId?: string,
): Promise<boolean> {
  const existing = await prisma.user.findFirst({
    where: {
      nickname,
      ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}),
    },
  });
  return Boolean(existing);
}

export async function resolveSteamNickname(
  personaName: string,
  steamId: string,
  exceptUserId?: string,
): Promise<string> {
  const base = steamPersonaToNickname(personaName);
  const fallback = sanitizeNickname(`STEAM${steamId.slice(-4)}`);

  if (base.length < 3) {
    if (!await isNicknameTaken(fallback, exceptUserId)) return fallback;
    return sanitizeNickname(`S${steamId.slice(-8)}`);
  }

  if (!await isNicknameTaken(base, exceptUserId)) return base;

  const withSteamTail = sanitizeNickname(`${base.slice(0, 15)}_${steamId.slice(-4)}`);
  if (withSteamTail.length >= 3 && !await isNicknameTaken(withSteamTail, exceptUserId)) {
    return withSteamTail;
  }

  return sanitizeNickname(`S${steamId.slice(-8)}`);
}

export async function syncNicknameFromSteam(
  personaName: string,
  steamId: string,
  currentUserId: string,
  currentNickname: string,
  profileComplete: boolean,
): Promise<string | null> {
  if (profileComplete) return null;

  const ideal = await resolveSteamNickname(personaName, steamId, currentUserId);
  if (ideal === currentNickname) return null;
  return ideal;
}
