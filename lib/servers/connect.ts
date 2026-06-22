/** CS2 on Steam (do not use for legacy server connect — opens cs2.exe). */
export const CS2_STEAM_APP_ID = 730;

/**
 * Counter-Strike: Global Offensive (legacy client), unlisted on Steam store.
 * @see https://store.steampowered.com/app/4465480/CounterStrikeGlobal_Offensive/
 */
export const CSGO_STEAM_APP_ID = 4465480;

/**
 * Legacy CS:GO client binary. steam://run/730 launches CS2; use {@link CSGO_STEAM_APP_ID}.
 * @see https://developer.valvesoftware.com/wiki/Steam_browser_protocol#run
 */
export const CSGO_LEGACY_EXE = "csgo.exe";

export function formatConnectAddress(
  host: string | null | undefined,
  port: number | null | undefined,
): string | null {
  if (!host || !port) return null;
  return `${host}:${port}`;
}

export function formatConnectCommand(
  host: string | null | undefined,
  port: number | null | undefined,
): string | null {
  const address = formatConnectAddress(host, port);
  return address ? `connect ${address}` : null;
}

/**
 * Steam URI that launches CS:GO Legacy (csgo.exe) with +connect when the game is closed.
 * steam://connect/ only connects if a CS client is already running (often CS2).
 */
export function steamConnectUrl(
  host: string | null | undefined,
  port: number | null | undefined,
): string | null {
  const address = formatConnectAddress(host, port);
  if (!address) return null;
  const encodedAddress = encodeURIComponent(address);
  return `steam://run/${CSGO_STEAM_APP_ID}/${CSGO_LEGACY_EXE}/+connect%20${encodedAddress}`;
}

/** Direct connect when CS is already running (fallback). */
export function steamDirectConnectUrl(
  host: string | null | undefined,
  port: number | null | undefined,
): string | null {
  const address = formatConnectAddress(host, port);
  return address ? `steam://connect/${address}` : null;
}

export function isSteamConnectHref(href: string): boolean {
  return href.startsWith("steam://");
}

export function openSteamConnectUrl(url: string): void {
  window.location.assign(url);
}
