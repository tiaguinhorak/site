export function hasSteamLinked(user: { steamId: string | null }): boolean {
  return Boolean(user.steamId);
}

export const STEAM_REQUIRED_MESSAGE =
  "Vincule sua conta Steam para jogar nos servidores e entrar na fila ranqueada.";
