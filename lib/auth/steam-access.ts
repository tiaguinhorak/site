export const STEAM_REQUIRED_MESSAGE =
  "Vincule sua conta Steam no perfil para usar inventário, ranked e servidores.";

export function hasSteamLinked(user: {
  steamId?: string | null;
  steamLinkedAt?: Date | null;
}): boolean {
  return Boolean(user.steamId?.trim() || user.steamLinkedAt);
}
