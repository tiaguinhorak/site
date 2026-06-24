const ALLOWED_STICKER_IMAGE_HOSTS = new Set([
  "cdn.steamstatic.com",
  "steamcdn-a.akamaihd.net",
  "community.akamai.steamstatic.com",
  "community.cloudflare.steamstatic.com",
  "avatars.steamstatic.com",
  "raw.githubusercontent.com",
]);

/** Normalize CSGO-API / catalog sticker icon URLs for CSP-safe loading. */
export function normalizeStickerImageUrl(
  url: string | null | undefined,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_STICKER_IMAGE_HOSTS.has(parsed.hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function stickerHasDisplayImage(url: string | null | undefined): boolean {
  return normalizeStickerImageUrl(url) !== null;
}
