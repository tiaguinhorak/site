import "server-only";

import {
  apiSkinToCatalogRow,
  catalogKey,
  CSGO_API_SKINS_URL,
  fetchCsgoApiSkinsPayload,
  type CatalogRowFromApi,
  type CsgoApiSkin,
} from "@/lib/inventory/csgo-api-catalog-shared";
import {
  isWeaponSkinCategory,
} from "@/lib/inventory/catalog-categories";

export {
  apiSkinToCatalogRow,
  catalogKey,
  CSGO_API_SKINS_URL,
  type CatalogRowFromApi,
  type CsgoApiSkin,
} from "@/lib/inventory/csgo-api-catalog-shared";

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

async function buildIndex(): Promise<IndexCache> {
  const payload = await fetchCsgoApiSkinsPayload();
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
