import { getUploadPublicBaseUrl } from "./config";

const PUBLIC_PREFIX = "/uploads/";

/** Storage key from a DB/public path (`/uploads/avatars/x.webp` → `avatars/x.webp`). */
export function publicUrlToKey(publicPath: string | null | undefined): string | null {
  if (!publicPath) return null;

  const withoutQuery = publicPath.split("?")[0]!.trim();
  const base = getUploadPublicBaseUrl();

  if (base && withoutQuery.startsWith(base)) {
    const suffix = withoutQuery.slice(base.length).replace(/^\/+/, "");
    return suffix || null;
  }

  if (!withoutQuery.startsWith(PUBLIC_PREFIX)) return null;
  return withoutQuery.slice(PUBLIC_PREFIX.length) || null;
}

export function keyToPublicPath(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  const base = getUploadPublicBaseUrl();
  if (base) return `${base}/${normalized}`;
  return `${PUBLIC_PREFIX}${normalized}`;
}

export function versionedPublicPath(publicPath: string): string {
  const base = publicPath.split("?")[0]!;
  return `${base}?v=${Date.now()}`;
}
