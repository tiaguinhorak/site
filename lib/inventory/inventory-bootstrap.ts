import type { getCatalogSkinsForUser } from "@/lib/inventory/get-catalog-skins";
import type { getUserServerLoadout } from "@/lib/inventory/get-user-loadout";

export type InventoryBootstrapData = {
  loadout: Awaited<ReturnType<typeof getUserServerLoadout>>;
  catalog: Awaited<ReturnType<typeof getCatalogSkinsForUser>>;
};
