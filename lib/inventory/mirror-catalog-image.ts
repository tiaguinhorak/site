import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { lookupRemoteCatalogImageUrl } from "@/lib/inventory/csgo-api-catalog-shared";
import {
  CATALOG_SKINS_PUBLIC_DIR,
  catalogLocalImagePath,
  isLocalCatalogImageUrl,
  isRemoteCatalogImageUrl,
  sanitizeCatalogImageId,
} from "@/lib/inventory/catalog-image-path";

const DEFAULT_SIZE = 512;
const WEBP_QUALITY = 82;
const FETCH_TIMEOUT_MS = 20_000;

export type MirrorCatalogImageResult =
  | { ok: true; localPath: string; skipped?: boolean }
  | { ok: false; error: string };

function absolutePublicPath(relativeFromPublic: string): string {
  return path.join(process.cwd(), "public", relativeFromPublic.replace(/^\//, ""));
}

export function catalogImageAbsolutePath(catalogId: string): string {
  return absolutePublicPath(catalogLocalImagePath(catalogId));
}

async function ensureCatalogSkinsDir(): Promise<void> {
  await fs.mkdir(path.join(process.cwd(), CATALOG_SKINS_PUBLIC_DIR), { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveSourceUrl(
  catalogId: string,
  imageUrl: string | null | undefined,
): Promise<string | null> {
  if (imageUrl?.trim()) {
    const trimmed = imageUrl.trim();
    if (isRemoteCatalogImageUrl(trimmed)) return trimmed;
  }
  return lookupRemoteCatalogImageUrl(catalogId);
}

/**
 * Downloads a remote preview once during sync and stores it under public/catalog/skins.
 * Returns the site-relative path saved in CsgoSkinCatalog.imageUrl.
 */
export async function mirrorCatalogImage(
  catalogId: string,
  imageUrl: string | null | undefined,
  options?: { force?: boolean },
): Promise<MirrorCatalogImageResult> {
  const localPath = catalogLocalImagePath(catalogId);
  const absolutePath = catalogImageAbsolutePath(catalogId);

  if (!options?.force && (await fileExists(absolutePath))) {
    return { ok: true, localPath, skipped: true };
  }

  const sourceUrl = await resolveSourceUrl(catalogId, imageUrl);
  if (!sourceUrl) {
    if (await fileExists(absolutePath)) {
      return { ok: true, localPath, skipped: true };
    }
    return { ok: false, error: `Sem URL remota para ${sanitizeCatalogImageId(catalogId)}` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    await ensureCatalogSkinsDir();
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: { Accept: "image/*" },
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status} ao baixar ${catalogId}` };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await sharp(buffer)
      .resize(DEFAULT_SIZE, DEFAULT_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: WEBP_QUALITY })
      .toFile(absolutePath);

    return { ok: true, localPath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function mirrorCatalogImages(
  rows: Array<{ id: string; imageUrl: string | null }>,
  options?: { force?: boolean; concurrency?: number; onProgress?: (done: number, total: number) => void },
): Promise<{ mirrored: number; skipped: number; failed: number; errors: string[] }> {
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 8, 16));
  let mirrored = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < rows.length) {
      const current = index;
      index += 1;
      const row = rows[current];
      const result = await mirrorCatalogImage(row.id, row.imageUrl, { force: options?.force });
      if (result.ok) {
        if (result.skipped) skipped += 1;
        else mirrored += 1;
      } else {
        failed += 1;
        if (errors.length < 20) errors.push(`${row.id}: ${result.error}`);
      }
      options?.onProgress?.(current + 1, rows.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { mirrored, skipped, failed, errors };
}

export async function catalogLocalImageExists(catalogId: string): Promise<boolean> {
  return fileExists(catalogImageAbsolutePath(catalogId));
}
