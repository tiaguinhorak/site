import "server-only";

import {
  isLocalCatalogImageUrl,
  resolveCatalogSkinImageUrl,
} from "@/lib/inventory/catalog-image-path";
import { lookupRemoteCatalogImageUrl } from "@/lib/inventory/csgo-api-catalog-shared";
import { catalogLocalImageExists } from "@/lib/inventory/mirror-catalog-image";
import { economyImageUrl } from "@/lib/inventory/skin-images";

let missingLocalWarned = false;

/**
 * Resolves catalog image URLs for API responses.
 * If DB points to a local path but the file is missing, falls back to the
 * cached CSGO-API image URL until `npm run sync:skin-images` is run.
 */
export async function resolveCatalogSkinImageUrlServer(
  imageUrl: string | null | undefined,
  catalogId: string | null | undefined,
  size: 256 | 512 = 256,
): Promise<string | null> {
  const candidate = resolveCatalogSkinImageUrl(imageUrl, catalogId);
  if (!candidate || !catalogId || !isLocalCatalogImageUrl(candidate)) {
    return candidate;
  }

  if (await catalogLocalImageExists(catalogId)) {
    return candidate;
  }

  const remote = await lookupRemoteCatalogImageUrl(catalogId);
  if (remote) {
    return economyImageUrl(remote, size) ?? remote;
  }

  if (!missingLocalWarned) {
    console.warn(
      "[catalog] Arquivos locais ausentes em public/catalog/skins — rode npm run sync:skin-images",
    );
    missingLocalWarned = true;
  }

  return candidate;
}
