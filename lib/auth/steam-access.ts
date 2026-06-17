export function hasSteamLinked(user: { steamId: string | null }): boolean {
  return Boolean(user.steamId);
}

export const STEAM_REQUIRED_MESSAGE =
  "Vincule sua conta Steam para usar o anticheat e entrar nos servidores.";
