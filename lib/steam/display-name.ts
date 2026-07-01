import { STEAM_FALLBACK_PERSONA } from "@/lib/steam/sync-profiles-core";

export type SteamDisplayNameUser = {
  nickname: string;
  steamId?: string | null;
  steamPersonaName?: string | null;
};

export function isStaleSteamPersonaName(name: string | null | undefined): boolean {
  if (!name?.trim()) return true;
  return STEAM_FALLBACK_PERSONA.test(name.trim());
}

/** Nome visível na plataforma — persona Steam quando vinculada, senão nickname do site. */
export function resolveSteamDisplayName(user: SteamDisplayNameUser): string {
  if (
    user.steamId &&
    user.steamPersonaName?.trim() &&
    !isStaleSteamPersonaName(user.steamPersonaName)
  ) {
    return user.steamPersonaName.trim();
  }
  return user.nickname;
}

export const STEAM_DISPLAY_NAME_SELECT = {
  nickname: true,
  steamId: true,
  steamPersonaName: true,
} as const;
