/** Local catalog image paths served from /public/catalog/skins. */

export const CATALOG_SKINS_PUBLIC_DIR = "public/catalog/skins";

export function sanitizeCatalogImageId(catalogId: string): string {
  return catalogId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function catalogLocalImagePath(catalogId: string): string {
  return `/catalog/skins/${sanitizeCatalogImageId(catalogId)}.webp`;
}

export function isLocalCatalogImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const trimmed = url.trim();
  return trimmed.startsWith("/catalog/skins/");
}

export function isRemoteCatalogImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const trimmed = url.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

/** Prefer persisted DB url; fall back to expected local path for a catalog id. */
export function resolveCatalogSkinImageUrl(
  imageUrl: string | null | undefined,
  catalogId: string | null | undefined,
): string | null {
  if (imageUrl?.trim()) {
    const trimmed = imageUrl.trim();
    if (isLocalCatalogImageUrl(trimmed)) return trimmed;
    if (isRemoteCatalogImageUrl(trimmed) && catalogId) {
      return catalogLocalImagePath(catalogId);
    }
    return trimmed;
  }
  if (catalogId) return catalogLocalImagePath(catalogId);
  return null;
}
