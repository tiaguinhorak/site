import {
  agentGridImageUrl,
  agentPreviewImageUrl,
  skinGridImageUrl,
  skinPreviewImageUrl,
} from "@/lib/inventory/skin-images";
import { normalizeStickerImageUrl } from "@/lib/inventory/sticker-image-url";

export type EconomyImagePreset = "skin-grid" | "skin-preview" | "agent-grid" | "agent-preview" | "sticker";

const loaded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

function resolveUrl(
  raw: string | null | undefined,
  preset: EconomyImagePreset,
): string | null {
  if (!raw?.trim()) return null;
  switch (preset) {
    case "skin-preview":
      return skinPreviewImageUrl(raw) ?? raw.trim();
    case "skin-grid":
      return skinGridImageUrl(raw) ?? raw.trim();
    case "agent-preview":
      return agentPreviewImageUrl(raw) ?? raw.trim();
    case "agent-grid":
      return agentGridImageUrl(raw) ?? raw.trim();
    case "sticker":
      return normalizeStickerImageUrl(raw) ?? raw.trim();
    default:
      return raw.trim();
  }
}

/** Returns true if this URL was already loaded in this browser session. */
export function isEconomyImageCached(url: string): boolean {
  return loaded.has(url);
}

/** Mark a URL as loaded (e.g. after <img> onLoad in RemoteImage). */
export function markEconomyImageLoaded(url: string): void {
  loaded.add(url);
}

/** Preload a single economy image URL (deduped, in-flight shared). */
export function preloadEconomyImage(
  raw: string | null | undefined,
  preset: EconomyImagePreset = "skin-grid",
): void {
  if (typeof window === "undefined") return;
  const url = resolveUrl(raw, preset);
  if (!url || loaded.has(url)) return;

  const pending = inflight.get(url);
  if (pending) return;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      loaded.add(url);
      inflight.delete(url);
      resolve();
    };
    img.onerror = () => {
      inflight.delete(url);
      resolve();
    };
    img.src = url;
  });
  inflight.set(url, promise);
}

/** Preload many economy images (grid tiles, picker pages, etc.). */
export function preloadEconomyImages(
  urls: Array<string | null | undefined>,
  preset: EconomyImagePreset = "skin-grid",
  limit = 48,
): void {
  for (const raw of urls.slice(0, limit)) {
    preloadEconomyImage(raw, preset);
  }
}

/** Back-compat alias used by inventory grid. */
export function preloadSkinGridImages(
  imageUrls: Array<string | null | undefined>,
  limit = 36,
): void {
  preloadEconomyImages(imageUrls, "skin-grid", limit);
}

export function preloadSkinPreviewImage(url: string | null | undefined): void {
  preloadEconomyImage(url, "skin-preview");
}

export function preloadStickerImages(
  urls: Array<string | null | undefined>,
  limit = 24,
): void {
  preloadEconomyImages(urls, "sticker", limit);
}
