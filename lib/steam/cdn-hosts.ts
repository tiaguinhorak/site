/** Hostnames allowed for Steam economy / avatar CDN images (CSP + URL validation). */
export const STEAM_IMAGE_HOST_SUFFIXES = [
  ".steamstatic.com",
  "steamstatic.com",
  "steamcdn-a.akamaihd.net",
] as const;

export const GITHUB_IMAGE_HOST_SUFFIXES = [
  ".githubusercontent.com",
  "raw.githubusercontent.com",
] as const;

export function isAllowedSteamImageHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return STEAM_IMAGE_HOST_SUFFIXES.some(
    (suffix) => lower === suffix || lower.endsWith(suffix),
  );
}

export function isAllowedRemoteImageHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (isAllowedSteamImageHost(lower)) return true;
  return GITHUB_IMAGE_HOST_SUFFIXES.some(
    (suffix) => lower === suffix || lower.endsWith(suffix),
  );
}
