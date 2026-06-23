import "server-only";

import {
  isWeaponSkinCategory,
  mapCatalogCategoryToUi,
  rarityLabelFromId,
} from "@/lib/inventory/catalog-categories";

export const CSGO_API_SKINS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

export type CsgoApiSkin = {
  id: string;
  name: string;
  image?: string;
  paint_index?: string | number;
  category?: { id?: string };
  weapon?: { id?: string; name?: string; weapon_id?: number | string };
  pattern?: { name?: string };
  rarity?: { id?: string };
};

export type CatalogRowFromApi = {
  id: string;
  weaponId: string;
  weaponName: string;
  paintkit: number;
  paintkitName: string;
  rarity: string;
  category: string;
  imageUrl: string | null;
  weaponDefIndex: number | null;
};

type IndexCache = {
  at: number;
  byKey: Map<string, CsgoApiSkin>;
  byWeapon: Map<string, CsgoApiSkin[]>;
  weapons: Array<{ weaponId: string; weaponName: string }>;
};

const CACHE_MS = 60 * 60 * 1000;
let cache: IndexCache | null = null;
let loadPromise: Promise<IndexCache> | null = null;

function normalizeWeaponId(skin: CsgoApiSkin): string | null {
  if (!skin.weapon?.id) return null;
  const id = String(skin.weapon.id);
  if (id.startsWith("sfui_wpnhud_")) return null;
  return id;
}

export function catalogKey(weaponId: string, paintkit: number): string {
  return `${weaponId.toLowerCase()}:${paintkit}`;
}

export function apiSkinToCatalogRow(skin: CsgoApiSkin): CatalogRowFromApi | null {
  const weaponId = normalizeWeaponId(skin);
  const paintkit = Number(skin.paint_index);
  if (!weaponId || !Number.isFinite(paintkit) || paintkit <= 0) return null;
  if (!isWeaponSkinCategory(skin.category?.id)) return null;

  const rawDefIndex = skin.weapon?.weapon_id;
  const weaponDefIndex =
    rawDefIndex !== undefined && rawDefIndex !== null && Number.isFinite(Number(rawDefIndex))
      ? Number(rawDefIndex)
      : null;

  return {
    id: skin.id,
    weaponId,
    weaponName: skin.weapon?.name ?? "Weapon",
    paintkit,
    paintkitName: skin.pattern?.name ?? skin.name,
    rarity: rarityLabelFromId(skin.rarity?.id ?? "rarity_common_weapon"),
    category: mapCatalogCategoryToUi(skin.category?.id, weaponId),
    imageUrl: skin.image ?? null,
    weaponDefIndex,
  };
}

async function buildIndex(): Promise<IndexCache> {
  const response = await fetch(CSGO_API_SKINS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha ao baixar CSGO-API (${response.status}).`);
  }

  const payload = (await response.json()) as CsgoApiSkin[];
  const byKey = new Map<string, CsgoApiSkin>();
  const byWeapon = new Map<string, CsgoApiSkin[]>();
  const weaponNames = new Map<string, string>();

  for (const skin of payload) {
    const weaponId = normalizeWeaponId(skin);
    const paintkit = Number(skin.paint_index);
    if (!weaponId || !Number.isFinite(paintkit) || paintkit <= 0) continue;
    if (!isWeaponSkinCategory(skin.category?.id)) continue;

    byKey.set(catalogKey(weaponId, paintkit), skin);
    const list = byWeapon.get(weaponId) ?? [];
    list.push(skin);
    byWeapon.set(weaponId, list);
    if (skin.weapon?.name) weaponNames.set(weaponId, skin.weapon.name);
  }

  const weapons = [...weaponNames.entries()]
    .map(([weaponId, weaponName]) => ({ weaponId, weaponName }))
    .sort((a, b) => a.weaponName.localeCompare(b.weaponName));

  return { at: Date.now(), byKey, byWeapon, weapons };
}

export async function getCsgoApiIndex(): Promise<IndexCache> {
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

export async function lookupCatalogFromApi(
  weaponId: string,
  paintkit: number,
): Promise<CatalogRowFromApi | null> {
  const index = await getCsgoApiIndex();
  const skin = index.byKey.get(catalogKey(weaponId, paintkit));
  if (!skin) return null;
  return apiSkinToCatalogRow(skin);
}

export async function listApiSkinsForWeapon(weaponId: string): Promise<CatalogRowFromApi[]> {
  const index = await getCsgoApiIndex();
  const skins = index.byWeapon.get(weaponId) ?? [];
  return skins
    .map((skin) => apiSkinToCatalogRow(skin))
    .filter((row): row is CatalogRowFromApi => row !== null)
    .sort((a, b) => a.paintkitName.localeCompare(b.paintkitName));
}

export async function listApiWeaponOptions(): Promise<Array<{ weaponId: string; weaponName: string }>> {
  const index = await getCsgoApiIndex();
  return index.weapons;
}

export function clearCsgoApiIndexCache(): void {
  cache = null;
}
