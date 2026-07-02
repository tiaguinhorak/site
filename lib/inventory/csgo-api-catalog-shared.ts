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

export async function fetchCsgoApiSkinsPayload(): Promise<CsgoApiSkin[]> {
  const response = await fetch(CSGO_API_SKINS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha ao baixar CSGO-API (${response.status}).`);
  }
  return (await response.json()) as CsgoApiSkin[];
}

let remoteImageByCatalogId: Map<string, string> | null = null;

export async function lookupRemoteCatalogImageUrl(catalogId: string): Promise<string | null> {
  if (!remoteImageByCatalogId) {
    const payload = await fetchCsgoApiSkinsPayload();
    remoteImageByCatalogId = new Map();
    for (const skin of payload) {
      if (skin.id && skin.image?.trim()) {
        remoteImageByCatalogId.set(skin.id, skin.image.trim());
      }
    }
  }
  return remoteImageByCatalogId.get(catalogId) ?? null;
}

export function clearRemoteCatalogImageCache(): void {
  remoteImageByCatalogId = null;
}
