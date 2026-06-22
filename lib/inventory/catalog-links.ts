/** Maps demo inventory display names to CsgoSkinCatalog ids (seed parity). */
export const INVENTORY_NAME_TO_CATALOG_ID: Record<string, string> = {
  "Karambit Gamma Doppler": "knife_gamma_doppler",
  "AK-47 Inheritance": "ak47_inheritance",
  "M4A4 Howl": "m4a4_howl",
  "AWP Dragon Lore": "awp_dragon_lore",
  "Desert Eagle Blaze": "deagle_blaze",
  "Glock-18 Fade": "glock_fade",
  "MP9 Starlight": "mp9_starlight",
  "Butterfly Knife Fade": "knife_bf_fade",
  "USP-S Kill Confirmed": "usp_kill_confirmed",
};

export function resolveCatalogIdForInventoryItem(
  name: string,
  catalogSkinId: string | null | undefined,
): string | null {
  if (catalogSkinId) return catalogSkinId;
  return INVENTORY_NAME_TO_CATALOG_ID[name] ?? null;
}
