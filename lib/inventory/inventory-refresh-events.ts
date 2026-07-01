import { clearAllCatalogGridCache } from "@/lib/inventory/catalog-grid-cache";
import { clearLoadoutClientCache } from "@/lib/inventory/loadout-client-cache";

export const INVENTORY_REFRESH_EVENT = "clutch:inventory-refresh";

export type InventoryRefreshDetail = {
  catalogSkinIds?: string[];
};

/** Dispara atualização imediata do inventário em todas as abas/páginas abertas. */
export function dispatchInventoryRefresh(detail?: InventoryRefreshDetail): void {
  if (typeof window === "undefined") return;
  clearAllCatalogGridCache();
  clearLoadoutClientCache();
  window.dispatchEvent(
    new CustomEvent(INVENTORY_REFRESH_EVENT, { detail: detail ?? {} }),
  );
}
