/** Normalize STEAM_API_KEY from .env (trim + strip accidental quotes). */
export function getSteamApiKey(): string | null {
  const raw = process.env.STEAM_API_KEY?.trim();
  if (!raw) return null;
  return raw.replace(/^["']+|["']+$/g, "");
}

export function hasSteamApiKey(): boolean {
  return Boolean(getSteamApiKey());
}
