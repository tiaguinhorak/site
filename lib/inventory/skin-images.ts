/** Catalog skin image URLs — local files from DB, no runtime Steam/API fetch. */
import {
  catalogLocalImagePath,
  isLocalCatalogImageUrl,
  resolveCatalogSkinImageUrl,
} from "@/lib/inventory/catalog-image-path";

export {
  catalogLocalImagePath,
  isLocalCatalogImageUrl,
  resolveCatalogSkinImageUrl,
} from "@/lib/inventory/catalog-image-path";

/** @deprecated Use resolveCatalogSkinImageUrl(imageUrl, catalogId) — kept for call sites. */
export function catalogSkinImageUrl(catalogId: string | null | undefined): string | null {
  if (!catalogId) return null;
  return catalogLocalImagePath(catalogId);
}

export function skinPreviewImageUrl(url: string | null | undefined): string | null {
  return resolveDisplayImageUrl(url, 512);
}

export function skinGridImageUrl(url: string | null | undefined): string | null {
  return resolveDisplayImageUrl(url, 256);
}

export function agentGridImageUrl(url: string | null | undefined): string | null {
  return resolveDisplayImageUrl(url, 384);
}

export function agentPreviewImageUrl(url: string | null | undefined): string | null {
  return resolveDisplayImageUrl(url, 512);
}

function resolveDisplayImageUrl(
  url: string | null | undefined,
  _size: number,
): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (isLocalCatalogImageUrl(trimmed)) return trimmed;
  return economyImageUrl(trimmed, _size);
}

/** Legacy Steam CDN resize — only used if old remote URLs remain in DB. */
export function economyImageUrl(
  url: string | null | undefined,
  size: number,
): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (isLocalCatalogImageUrl(trimmed)) return trimmed;
  if (!trimmed.includes("/economy/image/")) return trimmed;

  const suffix = `${size}fx${size}f`;
  const withoutSize = trimmed.replace(/\/(\d+fx\d+f(?:[^/]*)?|\d+x\d+(?:[^/]*)?)$/i, "");
  if (withoutSize.endsWith(`/${suffix}`)) return withoutSize;
  return `${withoutSize}/${suffix}`;
}
