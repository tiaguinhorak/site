export const CSGO_STEAM_APP_ID = 730;

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
 * Steam URI that launches CS:GO with +connect (works when the game is closed).
 * steam://connect/ only connects if CS is already running — causes the "click twice" issue.
 */
export function steamConnectUrl(
  host: string | null | undefined,
  port: number | null | undefined,
): string | null {
  const address = formatConnectAddress(host, port);
  if (!address) return null;
  const encodedAddress = encodeURIComponent(address);
  return `steam://run/${CSGO_STEAM_APP_ID}//+connect%20${encodedAddress}`;
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
