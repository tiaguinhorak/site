import { isAllowedRemoteImageHost } from "@/lib/steam/cdn-hosts";

/** Normalize CSGO-API / catalog sticker icon URLs for CSP-safe loading. */
export function normalizeStickerImageUrl(
  url: string | null | undefined,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!isAllowedRemoteImageHost(parsed.hostname)) {
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
