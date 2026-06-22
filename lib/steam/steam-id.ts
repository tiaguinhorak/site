const STEAM_ID64_BASE = BigInt("76561197960265728");

export function isSteamId64(steamId: string): boolean {
  return /^\d{17}$/.test(steamId.trim());
}

export function isSteam2(steamId: string): boolean {
  return /^STEAM_[0-5]:[0-1]:\d+$/i.test(steamId.trim());
}

/** Steam64 (site DB) → STEAM_0:x:y (SourceMod GetClientAuthId). */
export function steamId64ToSteam2(steamId64: string): string | null {
  const trimmed = steamId64.trim();
  if (!isSteamId64(trimmed)) return null;
  const accountId = Number(BigInt(trimmed) - STEAM_ID64_BASE);
  if (!Number.isFinite(accountId) || accountId < 0) return null;
  const Y = accountId % 2;
  const Z = Math.floor(accountId / 2);
  return `STEAM_0:${Y}:${Z}`;
}

export function steam2ToSteamId64(steam2: string): string | null {
  const match = steam2.trim().match(/^STEAM_[0-5]:([0-1]):(\d+)$/i);
  if (!match) return null;
  const Y = Number(match[1]);
  const Z = Number(match[2]);
  if (!Number.isFinite(Y) || !Number.isFinite(Z)) return null;
  const accountId = Z * 2 + Y;
  return String(STEAM_ID64_BASE + BigInt(accountId));
}

/** Key used in clutch_skins.txt — must match in-game AuthId_Steam2. */
export function steamIdForGamePlugin(steamId: string): string {
  if (isSteam2(steamId)) return steamId.trim();
  const steam2 = steamId64ToSteam2(steamId);
  return steam2 ?? steamId.trim();
}

/** CS:GO may use STEAM_1:x:y while export uses STEAM_0:x:y — same account. */
export function alternateSteam2(steam2: string): string | null {
  const trimmed = steam2.trim();
  if (trimmed.startsWith("STEAM_0:")) return `STEAM_1:${trimmed.slice(8)}`;
  if (trimmed.startsWith("STEAM_1:")) return `STEAM_0:${trimmed.slice(8)}`;
  return null;
}
