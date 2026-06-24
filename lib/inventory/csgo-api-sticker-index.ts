import "server-only";

import { normalizeStickerImageUrl } from "@/lib/inventory/sticker-image-url";

export const CSGO_API_STICKERS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json";

export type CsgoApiSticker = {
  id: string;
  name: string;
  image?: string;
  def_index?: string | number;
  rarity?: { id?: string; name?: string };
  type?: string;
  effect?: string;
  tournament?: { name?: string };
};

export type StickerCatalogRowFromApi = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  stickerType: string | null;
  effect: string | null;
  tournament: string | null;
};

type IndexCache = {
  at: number;
  byDefIndex: Map<number, CsgoApiSticker>;
  stickers: CsgoApiSticker[];
};

const CACHE_MS = 60 * 60 * 1000;
let cache: IndexCache | null = null;
let loadPromise: Promise<IndexCache> | null = null;

function rarityLabel(rarity?: { id?: string; name?: string }): string {
  if (rarity?.name) return rarity.name.toLowerCase();
  const map: Record<string, string> = {
    rarity_default: "comum",
    rarity_rare: "raro",
    rarity_mythical: "épico",
    rarity_legendary: "lendário",
    rarity_ancient: "mítico",
    rarity_contraband: "mítico",
  };
  return map[rarity?.id ?? ""] ?? "comum";
}

export function apiStickerToCatalogRow(sticker: CsgoApiSticker): StickerCatalogRowFromApi | null {
  const defIndex = Number(sticker.def_index);
  if (!Number.isFinite(defIndex) || defIndex <= 0) return null;

  return {
    id: sticker.id,
    defIndex,
    name: sticker.name,
    imageUrl: normalizeStickerImageUrl(sticker.image ?? null),
    rarity: rarityLabel(sticker.rarity),
    stickerType: sticker.type ?? null,
    effect: sticker.effect ?? null,
    tournament: sticker.tournament?.name ?? null,
  };
}

async function buildIndex(): Promise<IndexCache> {
  const response = await fetch(CSGO_API_STICKERS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha ao baixar stickers CSGO-API (${response.status}).`);
  }

  const payload = (await response.json()) as CsgoApiSticker[];
  const byDefIndex = new Map<number, CsgoApiSticker>();

  for (const sticker of payload) {
    const defIndex = Number(sticker.def_index);
    if (!Number.isFinite(defIndex) || defIndex <= 0) continue;
    byDefIndex.set(defIndex, sticker);
  }

  return { at: Date.now(), byDefIndex, stickers: payload };
}

export async function getCsgoApiStickerIndex(): Promise<IndexCache> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache;
  if (!loadPromise) {
    loadPromise = buildIndex().finally(() => {
      loadPromise = null;
    });
  }
  cache = await loadPromise;
  return cache;
}

export async function lookupStickerFromApi(defIndex: number): Promise<StickerCatalogRowFromApi | null> {
  const index = await getCsgoApiStickerIndex();
  const sticker = index.byDefIndex.get(defIndex);
  if (!sticker) return null;
  return apiStickerToCatalogRow(sticker);
}

export async function listAllStickersFromApi(): Promise<StickerCatalogRowFromApi[]> {
  const index = await getCsgoApiStickerIndex();
  return index.stickers
    .map((s) => apiStickerToCatalogRow(s))
    .filter((row): row is StickerCatalogRowFromApi => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
