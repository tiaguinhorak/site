"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Swords,
  Hand,
  Crosshair,
  Target,
  Zap,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  PackageOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type InventoryCategoryKey } from "@/lib/profile";
import { cn } from "@/lib/utils";
import {
  chipInactiveHoverClass,
  surfaceInputClass,
} from "@/lib/ui/theme-surfaces";
import { SkinRarityBadge } from "@/components/skins/skin-rarity-badge";
import {
  type EquipSide,
  type LoadoutTeam,
  weaponSupportsBothTeams,
} from "@/lib/inventory/loadout-team";
import type { RarityKey } from "@/lib/inventory/rarity-tiers";
import {
  EquippedLoadoutGrid,
  type EquippedLoadoutEntry,
} from "@/components/inventory/equipped-loadout-grid";
import { GameServerPushBanner } from "@/components/inventory/game-server-push-banner";
import { InventorySkinTile } from "@/components/inventory/inventory-skin-tile";
import { SkinRarityFilter } from "@/components/inventory/skin-rarity-filter";
import {
  SkinWorkspace,
  type SkinWorkspaceData,
} from "@/components/inventory/skin-workspace";
import { AgentWorkspace } from "@/components/inventory/agent-workspace";
import { prefetchSkinPickerPage } from "@/lib/inventory/skin-picker-cache";
import {
  readCatalogGridCache,
  writeCatalogGridCache,
  patchCatalogGridCacheEquipState,
  prefetchCatalogGrid,
  type CatalogGridCacheParams,
} from "@/lib/inventory/catalog-grid-cache";
import {
  readLoadoutClientCache,
  writeLoadoutClientCache,
} from "@/lib/inventory/loadout-client-cache";
import {
  applyOptimisticEquipToLoadout,
  applyOptimisticUnequipToLoadout,
} from "@/lib/inventory/optimistic-loadout-equip";
import { agentLoadoutFromEquippedItems } from "@/lib/inventory/agent-loadout-from-items";
import {
  applyOptimisticEquipToCatalog,
  applyOptimisticUnequipToCatalog,
} from "@/lib/inventory/optimistic-catalog-equip";
import { mapCatalogCategoryToUi } from "@/lib/inventory/catalog-categories";
import { loadoutItemToPreview } from "@/lib/inventory/skin-preview-mappers";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { useUser } from "@/lib/hooks/use-user";
import {
  canUseStickersForPlan,
  canUseAgentsForPlan,
  maxStickerSlotsForPlan,
} from "@/lib/inventory/plan-inventory-client";
import { toast } from "@/lib/toast";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";
import { preloadSkinGridImages, preloadSkinPreviewImage } from "@/lib/inventory/preload-skin-images";
import type { InventoryBootstrapData } from "@/lib/inventory/inventory-bootstrap";

type AgentLoadoutState = {
  agentT: number;
  agentCT: number;
  agentTName: string | null;
  agentCTName: string | null;
  agentTImage: string | null;
  agentCTImage: string | null;
};

type AgentCatalogItem = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  team: string;
};

type CatalogSkin = {
  id: string;
  name: string;
  category: InventoryCategoryKey;
  rarity: string;
  accent: string;
  imageUrl?: string | null;
  weaponId: string;
  weaponName?: string;
  paintkit: number;
  paintkitName: string;
  equipped: boolean;
  equippedT: boolean;
  equippedCT: boolean;
  owned: boolean;
};

type LoadoutResponse = {
  steamLinked: boolean;
  steamId: string | null;
  steamId2?: string | null;
  items: EquippedLoadoutEntry[];
};

function catalogGridCacheParams(
  category: string,
  page: number,
  search: string,
  weaponId: string,
  dualTeamOnly: boolean,
  rarityTier: string,
): CatalogGridCacheParams {
  return {
    category,
    page,
    search,
    weaponId,
    dualTeamOnly,
    rarityTier,
  };
}

function resolveInitialInventoryState(bootstrap: InventoryBootstrapData | null) {
  const gridParams = catalogGridCacheParams("all", 1, "", "", false, "all");
  // Never read sessionStorage here — it is empty on the server but may hold data on
  // the client, which produces different initial HTML and triggers hydration recovery
  // (in dev: cascades of GET /dashboard/inventario and a frozen UI).
  if (bootstrap?.catalog != null) {
    return {
      gridParams,
      catalogCache: {
        items: bootstrap.catalog.items,
        page: bootstrap.catalog.page,
        totalPages: bootstrap.catalog.totalPages,
        resultTotal: bootstrap.catalog.total,
        catalogTotal: bootstrap.catalog.catalogTotal,
        weaponOptions: bootstrap.catalog.weaponOptions,
        availableRarityTiers: bootstrap.catalog.availableRarityTiers,
        at: Number.MAX_SAFE_INTEGER,
      },
      loadoutCache: bootstrap.loadout ?? null,
    };
  }
  return { gridParams, catalogCache: null, loadoutCache: null };
}

function scheduleSkinGridPreload(urls: Array<string | null | undefined>): void {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => {
    preloadSkinGridImages(urls);
  });
}

function unequipSideForItem(item: { equippedT: boolean; equippedCT: boolean }): EquipSide {
  if (item.equippedT && item.equippedCT) return "both";
  if (item.equippedT) return "T";
  return "CT";
}

function catalogToWorkspace(
  item: CatalogSkin,
  categoryLabel?: string,
): SkinWorkspaceData {
  return {
    catalogSkinId: item.id,
    name: item.name,
    weaponId: item.weaponId,
    weaponName: item.weaponName,
    paintkitName: item.paintkitName,
    imageUrl: item.imageUrl ?? null,
    accent: item.accent,
    rarity: item.rarity,
    category: categoryLabel,
    categoryKey: item.category,
    owned: item.owned,
    equippedT: item.equippedT,
    equippedCT: item.equippedCT,
  };
}

function loadoutToWorkspace(item: EquippedLoadoutEntry): SkinWorkspaceData {
  const categoryKey =
    item.category ?? mapCatalogCategoryToUi(undefined, item.weaponId);
  return {
    catalogSkinId: item.catalogSkinId,
    name: item.name,
    weaponId: item.weaponId,
    imageUrl: item.imageUrl,
    accent: item.accent,
    rarity: item.rarity,
    categoryKey,
    owned: true,
    equippedT: item.equippedT,
    equippedCT: item.equippedCT,
  };
}

function mergeWorkspaceFromSources(
  skin: SkinWorkspaceData,
  catalog?: CatalogSkin | null,
  loadout?: EquippedLoadoutEntry | null,
): SkinWorkspaceData {
  const equippedT = loadout?.equippedT ?? catalog?.equippedT ?? skin.equippedT;
  const equippedCT = loadout?.equippedCT ?? catalog?.equippedCT ?? skin.equippedCT;
  return {
    ...skin,
    equippedT,
    equippedCT,
    owned: catalog?.owned ?? skin.owned ?? true,
    weaponName: catalog?.weaponName ?? skin.weaponName,
    paintkitName: catalog?.paintkitName ?? skin.paintkitName,
    imageUrl: catalog?.imageUrl ?? loadout?.imageUrl ?? skin.imageUrl,
    categoryKey:
      catalog?.category ??
      loadout?.category ??
      skin.categoryKey ??
      mapCatalogCategoryToUi(undefined, skin.weaponId),
  };
}

function applyLoadoutToCatalogItems(
  items: CatalogSkin[],
  loadoutItems: Array<{
    weaponId: string;
    catalogSkinId: string;
    equippedT: boolean;
    equippedCT: boolean;
  }>,
): CatalogSkin[] {
  const weaponT = new Map<string, string>();
  const weaponCT = new Map<string, string>();
  for (const entry of loadoutItems) {
    if (entry.equippedT) weaponT.set(entry.weaponId, entry.catalogSkinId);
    if (entry.equippedCT) weaponCT.set(entry.weaponId, entry.catalogSkinId);
  }
  return items.map((item) => {
    const equippedT = weaponT.get(item.weaponId) === item.id;
    const equippedCT = weaponCT.get(item.weaponId) === item.id;
    return {
      ...item,
      equippedT,
      equippedCT,
      equipped: equippedT || equippedCT,
    };
  });
}

const CATEGORY_ICON: Record<"all" | InventoryCategoryKey, typeof LayoutGrid> = {
  all: LayoutGrid,
  knife: Swords,
  gloves: Hand,
  rifle: Crosshair,
  pistol: Target,
  smg: Zap,
  agent: LayoutGrid,
};

async function postJson(
  url: string,
  body: unknown,
  partialSyncMessage: string,
) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-clutchclube-request": "1",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    gameSync?: { ok: boolean; error?: string; applyMode?: "staged" | "immediate" };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }
  if (payload?.gameSync && !payload.gameSync.ok) {
    throw new Error(partialSyncMessage);
  }
  return payload;
}

export function InventorySection({
  bootstrap = null,
}: {
  bootstrap?: InventoryBootstrapData | null;
}) {
  const initialState = useMemo(() => resolveInitialInventoryState(bootstrap), [bootstrap]);
  const { catalogCache: initialCatalogCache, loadoutCache: initialLoadoutCache } =
    initialState;
  const hasInitialGridItems = (initialCatalogCache?.items?.length ?? 0) > 0;

  const t = useTranslations("inventory");
  const { user } = useUser();
  const maxStickerSlots = maxStickerSlotsForPlan(
    user?.plan ?? "free",
    user?.isAdmin ?? false,
  );
  const canUseStickers = canUseStickersForPlan(
    user?.plan ?? "free",
    user?.isAdmin ?? false,
  );
  const canUseAgents = canUseAgentsForPlan(
    user?.plan ?? "free",
    user?.isAdmin ?? false,
  );

  const categoryLabels: Record<InventoryCategoryKey, string> = useMemo(
    () => ({
      knife: t("catKnife"),
      gloves: t("catGloves"),
      rifle: t("catRifle"),
      pistol: t("catPistol"),
      smg: t("catSmg"),
      agent: t("catAgent"),
    }),
    [t],
  );

  const filters: { id: "all" | InventoryCategoryKey; label: string }[] = useMemo(
    () => [
      { id: "all", label: t("catAll") },
      { id: "knife", label: t("catKnife") },
      { id: "gloves", label: t("catGloves") },
      { id: "rifle", label: t("catRifle") },
      { id: "pistol", label: t("catPistol") },
      { id: "smg", label: t("catSmg") },
      { id: "agent", label: t("catAgent") },
    ],
    [t],
  );

  const [items, setItems] = useState<CatalogSkin[]>(() => {
    const base = initialCatalogCache?.items ?? [];
    if (initialLoadoutCache && base.length > 0) {
      return applyLoadoutToCatalogItems(base, initialLoadoutCache.items);
    }
    return base;
  });
  const [agentItems, setAgentItems] = useState<AgentCatalogItem[]>([]);
  const [agentLoadout, setAgentLoadout] = useState<AgentLoadoutState | null>(
    initialLoadoutCache
      ? agentLoadoutFromEquippedItems(initialLoadoutCache.items)
      : null,
  );
  const [agentTeamBrowse, setAgentTeamBrowse] = useState<LoadoutTeam>("T");
  const [agentWorkspaceOpen, setAgentWorkspaceOpen] = useState(false);
  const [loadout, setLoadout] = useState<LoadoutResponse | null>(initialLoadoutCache);
  const [dualTeamOnly, setDualTeamOnly] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<RarityKey | "all">("all");
  const [filter, setFilter] = useState<"all" | InventoryCategoryKey>("all");
  const [weaponFilter, setWeaponFilter] = useState("");
  const [weaponOptions, setWeaponOptions] = useState<
    Array<{ weaponId: string; weaponName: string }>
  >(initialCatalogCache?.weaponOptions ?? []);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialCatalogCache?.totalPages ?? 1);
  const [resultTotal, setResultTotal] = useState(initialCatalogCache?.resultTotal ?? 0);
  const [catalogTotal, setCatalogTotal] = useState(initialCatalogCache?.catalogTotal ?? 0);
  const [loading, setLoading] = useState(!hasInitialGridItems);
  const [bootstrapped, setBootstrapped] = useState(hasInitialGridItems);
  const [loadError, setLoadError] = useState(false);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [unequippingId, setUnequippingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [workspace, setWorkspace] = useState<{
    skin: SkinWorkspaceData;
    tab: "skins" | "stickers";
    stickerTeam?: LoadoutTeam;
  } | null>(null);
  const [availableRarityTiers, setAvailableRarityTiers] = useState<RarityKey[]>(
    initialCatalogCache?.availableRarityTiers ?? [],
  );
  const reqIdRef = useRef(0);
  const skinsFetchInFlightRef = useRef<string | null>(null);
  const bootstrapFetchInFlightRef = useRef(false);
  const clientBootstrapRefreshDoneRef = useRef(false);
  const filterMountRef = useRef(true);
  const [uiReady, setUiReady] = useState(false);

  useEffect(() => {
    setUiReady(true);
  }, []);

  const canGoPrev = !loading && !refreshing && page > 1;
  const canGoNext = !loading && !refreshing && page < totalPages;

  const fetchLoadout = useCallback(async (options?: { silent?: boolean }) => {
    const cached = readLoadoutClientCache();
    if (cached && !options?.silent) {
      setLoadout(cached);
      setAgentLoadout(agentLoadoutFromEquippedItems(cached.items));
      setItems((prev) =>
        prev.length > 0 ? applyLoadoutToCatalogItems(prev, cached.items) : prev,
      );
    }

    if (!options?.silent) setRefreshing(true);
    try {
      const response = await fetch("/api/inventory/loadout", {
        credentials: "same-origin",
      });
      if (!response.ok) return cached ?? null;
      const data = (await response.json()) as LoadoutResponse;
      writeLoadoutClientCache(data);
      setLoadout(data);
      setAgentLoadout(agentLoadoutFromEquippedItems(data.items));
      setItems((prev) =>
        prev.length > 0 ? applyLoadoutToCatalogItems(prev, data.items) : prev,
      );
      return data;
    } finally {
      if (!options?.silent) setRefreshing(false);
    }
  }, []);

  const pushLoadoutToServer = useCallback(async () => {
    try {
      const response = await fetch("/api/inventory/push-loadout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-clutchclube-request": "1",
        },
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        gameSync?: { ok: boolean; error?: string; applyMode?: "staged" | "immediate" };
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("syncLoadoutFailed"));
      }
      if (payload?.gameSync?.ok) {
        toast.success(
          payload.gameSync.applyMode === "immediate"
            ? t("gameSyncImmediate")
            : t("gameSyncStaged"),
        );
      } else if (payload?.gameSync && !payload.gameSync.ok) {
        throw new Error(t("gameSyncPartial"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("syncLoadoutFailed"));
    }
  }, [t]);

  const refreshLoadoutAndServer = useCallback(async () => {
    setRefreshing(true);
    try {
      await pushLoadoutToServer();
      const response = await fetch("/api/inventory/loadout", {
        credentials: "same-origin",
      });
      if (response.ok) {
        const data = (await response.json()) as LoadoutResponse;
        writeLoadoutClientCache(data);
        setLoadout(data);
        setAgentLoadout(agentLoadoutFromEquippedItems(data.items));
        setItems((prev) =>
          prev.length > 0 ? applyLoadoutToCatalogItems(prev, data.items) : prev,
        );
      }
    } finally {
      setRefreshing(false);
    }
  }, [pushLoadoutToServer]);

  const fetchAgents = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setLoadError(false);

    try {
      const params = new URLSearchParams({
        picker: "1",
        page: String(page),
        limit: "36",
        team: agentTeamBrowse,
        search,
      });

      const [pickerResponse] = await Promise.all([
        fetch(`/api/inventory/agents?${params}`, { credentials: "same-origin" }),
      ]);

      if (reqId !== reqIdRef.current) return;
      if (!pickerResponse.ok) {
        setLoadError(true);
        return;
      }

      const data = await pickerResponse.json();
      if (reqId !== reqIdRef.current) return;

      setAgentItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setResultTotal(data.total ?? 0);
      setCatalogTotal(data.total ?? 0);
    } catch {
      if (reqId === reqIdRef.current) setLoadError(true);
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setBootstrapped(true);
      }
    }
  }, [page, search, agentTeamBrowse]);

  const fetchSkins = useCallback(async (options?: { silent?: boolean }) => {
    const cacheParams = catalogGridCacheParams(
      filter,
      page,
      search,
      weaponFilter,
      dualTeamOnly,
      rarityFilter,
    );
    const fetchKey = JSON.stringify(cacheParams) + (options?.silent ? ":silent" : "");
    if (skinsFetchInFlightRef.current === fetchKey) return;
    skinsFetchInFlightRef.current = fetchKey;

    const cached = readCatalogGridCache(cacheParams);
    const reqId = ++reqIdRef.current;

    if (!options?.silent) {
      if (cached?.items.length) {
        setItems(cached.items);
        setTotalPages(cached.totalPages);
        setResultTotal(cached.resultTotal);
        setCatalogTotal(cached.catalogTotal);
        if (page === 1 && cached.weaponOptions.length > 0) {
          setWeaponOptions(cached.weaponOptions);
        }
        if (cached.availableRarityTiers.length > 0) {
          setAvailableRarityTiers(cached.availableRarityTiers);
        }
        setLoadError(false);
        setLoading(false);
        setBootstrapped(true);
      } else {
        setLoading(true);
        setLoadError(false);
      }
    }

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "36",
        category: filter,
        search,
      });
      if (dualTeamOnly) params.set("dualTeamOnly", "1");
      if (rarityFilter !== "all") params.set("rarityTier", rarityFilter);
      if (weaponFilter) params.set("weaponId", weaponFilter);

      const response = await fetch(`/api/inventory/skins?${params}`, {
        credentials: "same-origin",
      });

      if (reqId !== reqIdRef.current) return;

      if (!response.ok) {
        if (!options?.silent && !cached?.items.length) setLoadError(true);
        return;
      }

      const data = await response.json();
      if (reqId !== reqIdRef.current) return;

      const nextItems = data.items ?? [];
      if (nextItems.length > 0 || !options?.silent) {
        setItems(nextItems);
      }
      setTotalPages(data.totalPages ?? 1);
      setResultTotal(data.total ?? 0);
      setCatalogTotal(data.catalogTotal ?? 0);
      if (page === 1 && Array.isArray(data.weaponOptions)) {
        setWeaponOptions(data.weaponOptions);
      }
      if (Array.isArray(data.availableRarityTiers)) {
        const tiers = data.availableRarityTiers as RarityKey[];
        setAvailableRarityTiers((prev) => {
          if (
            prev.length === tiers.length &&
            prev.every((tier, index) => tier === tiers[index])
          ) {
            return prev;
          }
          return tiers;
        });
      }

      writeCatalogGridCache(cacheParams, {
        items: nextItems,
        page: data.page ?? page,
        totalPages: data.totalPages ?? 1,
        resultTotal: data.total ?? 0,
        catalogTotal: data.catalogTotal ?? 0,
        weaponOptions: data.weaponOptions ?? [],
        availableRarityTiers: data.availableRarityTiers ?? [],
      });
      scheduleSkinGridPreload(nextItems.map((item: CatalogSkin) => item.imageUrl));

      const totalP = data.totalPages ?? 1;
      if (page < totalP && !options?.silent) {
        prefetchCatalogGrid({ ...cacheParams, page: page + 1 });
      }
      if (filter !== "all" && page === 1 && !options?.silent) {
        prefetchCatalogGrid(catalogGridCacheParams("all", 1, "", "", false, "all"));
      }
    } catch {
      if (!options?.silent && !cached?.items.length) setLoadError(true);
    } finally {
      if (skinsFetchInFlightRef.current === fetchKey) {
        skinsFetchInFlightRef.current = null;
      }
      if (!options?.silent && reqId === reqIdRef.current) {
        setLoading(false);
        setBootstrapped(true);
      }
    }
  }, [filter, page, search, weaponFilter, dualTeamOnly, rarityFilter]);

  const applyBootstrapData = useCallback(
    (data: InventoryBootstrapData, options?: { silent?: boolean }) => {
      writeLoadoutClientCache(data.loadout);
      setLoadout(data.loadout);
      setAgentLoadout(agentLoadoutFromEquippedItems(data.loadout.items));

      const gridParams = catalogGridCacheParams("all", 1, "", "", false, "all");
      writeCatalogGridCache(gridParams, {
        items: data.catalog.items,
        page: data.catalog.page,
        totalPages: data.catalog.totalPages,
        resultTotal: data.catalog.total,
        catalogTotal: data.catalog.catalogTotal,
        weaponOptions: data.catalog.weaponOptions,
        availableRarityTiers: data.catalog.availableRarityTiers,
      });

      const mergedItems = applyLoadoutToCatalogItems(
        data.catalog.items,
        data.loadout.items,
      );
      if (mergedItems.length > 0 || !options?.silent) {
        setItems(mergedItems);
      }
      setTotalPages(data.catalog.totalPages);
      setResultTotal(data.catalog.total);
      setCatalogTotal(data.catalog.catalogTotal);
      if (data.catalog.weaponOptions.length > 0) {
        setWeaponOptions(data.catalog.weaponOptions);
      }
      if (data.catalog.availableRarityTiers.length > 0) {
        setAvailableRarityTiers(data.catalog.availableRarityTiers);
      }
      setLoadError(false);
      setLoading(false);
      setBootstrapped(true);
      scheduleSkinGridPreload(mergedItems.map((item) => item.imageUrl));
    },
    [],
  );

  const refreshBootstrap = useCallback(
    async (options?: { silent?: boolean }) => {
      if (bootstrapFetchInFlightRef.current) return;
      bootstrapFetchInFlightRef.current = true;
      try {
        const response = await fetch("/api/inventory/bootstrap", {
          credentials: "same-origin",
        });
        if (!response.ok) {
          if (!options?.silent) setLoadError(true);
          return;
        }
        const data = (await response.json()) as InventoryBootstrapData;
        applyBootstrapData(data, options);
      } catch {
        if (!options?.silent) setLoadError(true);
      } finally {
        bootstrapFetchInFlightRef.current = false;
      }
    },
    [applyBootstrapData],
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (filterMountRef.current) {
      filterMountRef.current = false;
      return;
    }
    setPage(1);
    setWeaponFilter("");
    reqIdRef.current += 1;
  }, [filter, search, dualTeamOnly, rarityFilter]);

  useEffect(() => {
    if (rarityFilter !== "all" && availableRarityTiers.length > 0 && !availableRarityTiers.includes(rarityFilter)) {
      setRarityFilter("all");
    }
  }, [availableRarityTiers, rarityFilter]);

  useEffect(() => {
    if (!workspace) return;
    const catalog = items.find((i) => i.id === workspace.skin.catalogSkinId);
    const loadoutEntry = loadout?.items.find(
      (i) => i.catalogSkinId === workspace.skin.catalogSkinId,
    );
    setWorkspace((prev) => {
      if (!prev) return prev;
      const merged = mergeWorkspaceFromSources(prev.skin, catalog, loadoutEntry);
      if (
        merged.equippedT === prev.skin.equippedT &&
        merged.equippedCT === prev.skin.equippedCT &&
        merged.owned === prev.skin.owned
      ) {
        return prev;
      }
      return { ...prev, skin: merged };
    });
  }, [items, loadout, workspace?.skin.catalogSkinId]);

  useEffect(() => {
    if (clientBootstrapRefreshDoneRef.current) return;
    clientBootstrapRefreshDoneRef.current = true;

    const gridParams = catalogGridCacheParams("all", 1, "", "", false, "all");
    const catalogCache = readCatalogGridCache(gridParams);
    const loadoutCache = readLoadoutClientCache();

    if (catalogCache?.items.length || loadoutCache) {
      if (loadoutCache) {
        setLoadout(loadoutCache);
        setAgentLoadout(agentLoadoutFromEquippedItems(loadoutCache.items));
      }
      if (catalogCache?.items.length) {
        const merged = loadoutCache
          ? applyLoadoutToCatalogItems(catalogCache.items, loadoutCache.items)
          : catalogCache.items;
        setItems(merged);
        setTotalPages(catalogCache.totalPages);
        setResultTotal(catalogCache.resultTotal);
        setCatalogTotal(catalogCache.catalogTotal);
        if (catalogCache.weaponOptions.length > 0) {
          setWeaponOptions(catalogCache.weaponOptions);
        }
        if (catalogCache.availableRarityTiers.length > 0) {
          setAvailableRarityTiers(catalogCache.availableRarityTiers);
        }
        scheduleSkinGridPreload(merged.map((item) => item.imageUrl));
      }
      setLoadError(false);
      setLoading(false);
      setBootstrapped(true);
    }

    void refreshBootstrap({ silent: Boolean(catalogCache?.items.length || loadoutCache) });
  }, [refreshBootstrap]);

  useEffect(() => {
    if (filter === "agent") {
      fetchAgents();
      return;
    }

    const isDefaultGrid =
      filter === "all" &&
      page === 1 &&
      !search &&
      !weaponFilter &&
      !dualTeamOnly &&
      rarityFilter === "all";

    if (clientBootstrapRefreshDoneRef.current && isDefaultGrid) {
      return;
    }

    fetchSkins();
  }, [
    filter,
    fetchAgents,
    fetchSkins,
    page,
    search,
    weaponFilter,
    dualTeamOnly,
    rarityFilter,
  ]);

  const handleEquip = async (item: CatalogSkin, side: EquipSide) => {
    if (!item.owned) return;
    setEquippingId(item.id);
    const eqT = side === "T" || side === "both";
    const eqCT = side === "CT" || side === "both";
    patchCatalogGridCacheEquipState(item.id, item.weaponId, eqT, eqCT);
    setItems((prev) => applyOptimisticEquipToCatalog(prev, item.id, item.weaponId, side));
    setLoadout((prev) => {
      if (!prev) return prev;
      const nextItems = applyOptimisticEquipToLoadout(prev.items, {
        catalogSkinId: item.id,
        weaponId: item.weaponId,
        name: item.name,
        imageUrl: item.imageUrl ?? null,
        accent: item.accent,
        rarity: item.rarity,
        category: item.category,
        side,
      });
      const next = { ...prev, items: nextItems };
      writeLoadoutClientCache(next);
      return next;
    });
    setAgentLoadout((prev) =>
      prev
        ? {
            ...prev,
            agentT:
              item.category === "agent" && (side === "T" || side === "both")
                ? item.paintkit
                : prev.agentT,
            agentCT:
              item.category === "agent" && (side === "CT" || side === "both")
                ? item.paintkit
                : prev.agentCT,
          }
        : prev,
    );
    setWorkspace((prev) => {
      if (!prev || prev.skin.catalogSkinId !== item.id) return prev;
      const equippedT = side === "T" || side === "both";
      const equippedCT = side === "CT" || side === "both";
      return {
        ...prev,
        skin: { ...prev.skin, equippedT, equippedCT },
      };
    });
    try {
      const payload = await postJson(
        "/api/inventory/equip",
        {
          catalogSkinId: item.id,
          team: side,
        },
        t("gameSyncPartial"),
      );
      if (payload?.gameSync?.ok) {
        toast.success(
          payload.gameSync.applyMode === "immediate"
            ? t("gameSyncImmediate")
            : t("gameSyncStaged"),
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("equipFailed"));
      void fetchLoadout({ silent: true });
      void fetchSkins();
    } finally {
      setEquippingId(null);
    }
  };

  const handleUnequip = async (
    catalogSkinId: string,
    side: EquipSide,
  ) => {
    const catalogItem = items.find((i) => i.id === catalogSkinId);
    const newT = side === "both" || side === "T" ? false : catalogItem?.equippedT ?? false;
    const newCT = side === "both" || side === "CT" ? false : catalogItem?.equippedCT ?? false;
    if (catalogItem) {
      patchCatalogGridCacheEquipState(catalogSkinId, catalogItem.weaponId, newT, newCT);
    }
    setUnequippingId(catalogSkinId);
    setItems((prev) => applyOptimisticUnequipToCatalog(prev, catalogSkinId, side));
    setLoadout((prev) => {
      if (!prev) return prev;
      const nextItems = applyOptimisticUnequipToLoadout(prev.items, catalogSkinId, side);
      const next = { ...prev, items: nextItems };
      writeLoadoutClientCache(next);
      return next;
    });
    setWorkspace((prev) => {
      if (!prev || prev.skin.catalogSkinId !== catalogSkinId) return prev;
      const equippedT = side === "both" || side === "T" ? false : prev.skin.equippedT;
      const equippedCT = side === "both" || side === "CT" ? false : prev.skin.equippedCT;
      return {
        ...prev,
        skin: { ...prev.skin, equippedT, equippedCT },
      };
    });
    try {
      const payload = await postJson(
        "/api/inventory/unequip",
        {
          catalogSkinId,
          team: side,
        },
        t("gameSyncPartial"),
      );
      if (payload?.gameSync?.ok) {
        toast.success(
          payload.gameSync.applyMode === "immediate"
            ? t("gameSyncImmediate")
            : t("gameSyncStaged"),
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("unequipFailed"));
      void fetchLoadout({ silent: true });
      void fetchSkins();
    } finally {
      setUnequippingId(null);
    }
  };

  const openCatalogWorkspace = (
    item: CatalogSkin,
    tab: "skins" | "stickers" = "skins",
    stickerTeam?: LoadoutTeam,
  ) => {
    prefetchSkinPickerPage(item.weaponId, 1, "", 12);
    preloadSkinPreviewImage(item.imageUrl);
    setWorkspace({
      skin: catalogToWorkspace(item, categoryLabels[item.category]),
      tab,
      stickerTeam,
    });
  };

  const prefetchCatalogTile = (item: CatalogSkin) => {
    prefetchSkinPickerPage(item.weaponId, 1, "", 12);
    preloadSkinPreviewImage(item.imageUrl);
  };

  const openLoadoutWorkspace = (
    item: EquippedLoadoutEntry,
    tab: "skins" | "stickers" = "skins",
    stickerTeam?: LoadoutTeam,
  ) => {
    if (item.category === "agent") {
      setAgentWorkspaceOpen(true);
      return;
    }
    preloadSkinPreviewImage(item.imageUrl);
    setWorkspace({ skin: loadoutToWorkspace(item), tab, stickerTeam });
  };

  const workspaceCatalogItem =
    workspace
      ? items.find((i) => i.id === workspace.skin.catalogSkinId) ??
        ({
          id: workspace.skin.catalogSkinId,
          name: workspace.skin.name,
          category: "rifle" as InventoryCategoryKey,
          rarity: workspace.skin.rarity,
          accent: workspace.skin.accent,
          imageUrl: workspace.skin.imageUrl,
          weaponId: workspace.skin.weaponId,
          weaponName: workspace.skin.weaponName,
          paintkit: 0,
          paintkitName: workspace.skin.paintkitName ?? "",
          equipped: workspace.skin.equippedT || workspace.skin.equippedCT,
          equippedT: workspace.skin.equippedT,
          equippedCT: workspace.skin.equippedCT,
          owned: workspace.skin.owned ?? true,
        } satisfies CatalogSkin)
      : null;

  const equippedCount = loadout?.items.length ?? 0;
  const showDualTeamFilter = weaponOptions.some((w) => weaponSupportsBothTeams(w.weaponId));
  const isAgentView = filter === "agent";
  const showEmptyCatalog = bootstrapped && !loading && !loadError && catalogTotal === 0;
  const showNoResults =
    bootstrapped &&
    !loading &&
    !loadError &&
    catalogTotal > 0 &&
    (isAgentView ? agentItems.length === 0 : items.length === 0);
  const catalogGridLoading = loading && (isAgentView ? agentItems.length === 0 : items.length === 0);

  return (
    <section className="space-y-6">
      <GameServerPushBanner />
      <EquippedLoadoutGrid
        title={t("loadoutSidebarTitle")}
        count={equippedCount}
        steamLinked={loadout?.steamLinked ?? false}
        steamId={loadout?.steamId ?? null}
        steamId2={loadout?.steamId2}
        items={loadout?.items ?? []}
        refreshing={refreshing}
        onRefresh={refreshLoadoutAndServer}
        onOpen={openLoadoutWorkspace}
      />

      <div>
        <div className="mb-4 rounded-card glass-strong p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={cn("w-full rounded-xl py-2.5 pl-10 pr-4 text-sm", surfaceInputClass)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {filters.map((f) => {
              const Icon = CATEGORY_ICON[f.id];
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    prefetchCatalogGrid(
                      catalogGridCacheParams(
                        f.id,
                        1,
                        search,
                        "",
                        dualTeamOnly,
                        rarityFilter,
                      ),
                    );
                    setFilter(f.id);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground"
                      : chipInactiveHoverClass,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>

          {isAgentView && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
              <button
                type="button"
                onClick={() => {
                  setAgentTeamBrowse("T");
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  agentTeamBrowse === "T"
                    ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground"
                    : chipInactiveHoverClass,
                )}
              >
                {t("teamTShort")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgentTeamBrowse("CT");
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  agentTeamBrowse === "CT"
                    ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground"
                    : chipInactiveHoverClass,
                )}
              >
                {t("teamCTShort")}
              </button>
              <Button type="button" size="sm" onClick={() => setAgentWorkspaceOpen(true)}>
                {t("agentsOpenWorkspace")}
              </Button>
            </div>
          )}

          {!isAgentView && availableRarityTiers.length > 0 && (
          <div className="mt-3 border-t border-border/50 pt-3">
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted">
              {t("rarityLegendTitle")}
            </label>
            <SkinRarityFilter
              value={rarityFilter}
              availableTiers={availableRarityTiers}
              onChange={(tier) => {
                setRarityFilter(tier);
                setPage(1);
              }}
            />
          </div>
          )}

          {!isAgentView && showDualTeamFilter && (
          <div className="mt-3 border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={() => {
                setDualTeamOnly((v) => !v);
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                dualTeamOnly
                  ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground"
                  : chipInactiveHoverClass,
              )}
            >
              {t("dualTeamFilter")}
            </button>
            <p className="mt-1.5 text-[10px] text-muted">{t("dualTeamFilterHint")}</p>
          </div>
          )}

          {!isAgentView && weaponOptions.length > 0 && (
            <div className="mt-3 border-t border-border/50 pt-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                {t("weaponFilterLabel")}
              </label>
              <select
                value={weaponFilter}
                onChange={(e) => {
                  setWeaponFilter(e.target.value);
                  setPage(1);
                }}
                className={cn("w-full rounded-lg px-3 py-2 text-sm", surfaceInputClass)}
              >
                <option value="">{t("catAllWeapons")}</option>
                {weaponOptions.map((w) => (
                  <option key={w.weaponId} value={w.weaponId}>
                    {w.weaponName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

          {isAgentView && agentLoadout && (agentLoadout.agentT > 0 || agentLoadout.agentCT > 0) && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {agentLoadout.agentT > 0 && agentLoadout.agentTName ? (
                <button
                  type="button"
                  onClick={() => {
                    setAgentTeamBrowse("T");
                    setAgentWorkspaceOpen(true);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-left transition hover:bg-emerald-500/15",
                    chipInactiveHoverClass,
                  )}
                >
                  <InventorySkinTile
                    name={agentLoadout.agentTName}
                    imageUrl={agentLoadout.agentTImage}
                    accent="from-violet-600 to-fuchsia-600"
                    imagePreset="agent-grid"
                    equippedT
                    className="pointer-events-none w-20 shrink-0 border-0 bg-transparent p-0 shadow-none"
                    artClassName="h-14 w-14"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      {t("teamTShort")} · {t("agentsEquippedBadge")}
                    </p>
                    <p className="truncate text-sm font-medium">{agentLoadout.agentTName}</p>
                  </div>
                </button>
              ) : null}
              {agentLoadout.agentCT > 0 && agentLoadout.agentCTName ? (
                <button
                  type="button"
                  onClick={() => {
                    setAgentTeamBrowse("CT");
                    setAgentWorkspaceOpen(true);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-left transition hover:bg-emerald-500/15",
                    chipInactiveHoverClass,
                  )}
                >
                  <InventorySkinTile
                    name={agentLoadout.agentCTName}
                    imageUrl={agentLoadout.agentCTImage}
                    accent="from-violet-600 to-fuchsia-600"
                    imagePreset="agent-grid"
                    equippedCT
                    className="pointer-events-none w-20 shrink-0 border-0 bg-transparent p-0 shadow-none"
                    artClassName="h-14 w-14"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      {t("teamCTShort")} · {t("agentsEquippedBadge")}
                    </p>
                    <p className="truncate text-sm font-medium">{agentLoadout.agentCTName}</p>
                  </div>
                </button>
              ) : null}
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            {catalogGridLoading ? (
              <Skeleton className="h-4 w-56" />
            ) : (
              <span>{t("catalogCount", { count: resultTotal, page, totalPages })}</span>
            )}
            {!catalogGridLoading && catalogTotal > 0 && (
              <span className="text-xs text-muted/70">
                {t("itemsCount", { count: catalogTotal })}
              </span>
            )}
          </div>

          {catalogGridLoading ? (
            <div
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 transition-opacity"
              aria-busy="true"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <SkeletonCard key={i} className="h-32" />
              ))}
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 rounded-card glass py-16 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
              <p className="text-sm text-muted">{t("loadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={isAgentView ? fetchAgents : () => fetchSkins()}>
                <RefreshCw className="h-3.5 w-3.5" />
                {t("retry")}
              </Button>
            </div>
          ) : showEmptyCatalog ? (
            <div className="flex flex-col items-center gap-3 rounded-card glass py-16 text-center">
              <PackageOpen className="h-8 w-8 text-muted" />
              <p className="max-w-md text-sm text-muted">{t("catalogEmpty")}</p>
            </div>
          ) : showNoResults ? (
            <div className="flex flex-col items-center gap-3 rounded-card glass py-16 text-center">
              <Search className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">{t("noResults")}</p>
            </div>
          ) : isAgentView ? (
            <div
              className={cn(
                "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 transition-opacity",
                loading && "opacity-60",
              )}
            >
              {agentItems.map((item) => {
                const equippedT = agentLoadout?.agentT === item.defIndex;
                const equippedCT = agentLoadout?.agentCT === item.defIndex;
                const anyEquipped = equippedT || equippedCT;

                return (
                <InventorySkinTile
                  key={item.id}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  accent="from-violet-600 to-fuchsia-600"
                  imagePreset="agent-grid"
                  rarity={item.rarity}
                  equippedT={equippedT}
                  equippedCT={equippedCT}
                  onClick={() => setAgentWorkspaceOpen(true)}
                  className={cn(anyEquipped && "ring-1 ring-emerald-400/35")}
                >
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                    <SkinRarityBadge
                      rarity={item.rarity}
                      accent="from-violet-600 to-fuchsia-600"
                    />
                  </div>
                </InventorySkinTile>
                );
              })}
            </div>
          ) : (
            <div
              className={cn(
                "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 transition-opacity",
                loading && "opacity-60",
              )}
            >
              {items.map((item, index) => {
                const anyEquipped = item.equippedT || item.equippedCT;

                return (
                  <InventorySkinTile
                    key={item.id}
                    name={item.name}
                    imageUrl={item.imageUrl ?? null}
                    accent={item.accent}
                    rarity={item.rarity}
                    equippedT={item.equippedT}
                    equippedCT={item.equippedCT}
                    locked={!item.owned}
                    onClick={() => openCatalogWorkspace(item)}
                    onMouseEnter={() => prefetchCatalogTile(item)}
                    priority={index < 8}
                    className={cn(anyEquipped && "ring-1 ring-emerald-400/35")}
                  >
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                      <SkinRarityBadge rarity={item.rarity} accent={item.accent} />
                    </div>
                  </InventorySkinTile>
                );
              })}
            </div>
          )}

          {uiReady && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("prevPage")}
              </Button>
              <span className="min-w-16 text-center text-sm text-muted">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("nextPage")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
      </div>

      <AgentWorkspace
        open={agentWorkspaceOpen}
        canUseAgents={canUseAgents}
        initialLoadout={agentLoadout}
        initialTeam={agentTeamBrowse}
        onClose={() => setAgentWorkspaceOpen(false)}
        onSaved={() => {
          void fetchLoadout({ silent: true });
          if (filter === "agent") void fetchAgents();
        }}
      />

      <SkinWorkspace
        key={workspace ? workspace.skin.weaponId : "closed"}
        open={workspace !== null}
        skin={workspace?.skin ?? null}
        initialTab={workspace?.tab}
        initialStickerTeam={workspace?.stickerTeam}
        maxStickerSlots={maxStickerSlots}
        canUseStickers={canUseStickers}
        actionLoading={
          workspace?.skin.catalogSkinId
            ? equippingId === workspace.skin.catalogSkinId ||
              unequippingId === workspace.skin.catalogSkinId
            : false
        }
        onClose={() => setWorkspace(null)}
        onPreviewSkinChange={(next) =>
          setWorkspace((prev) => (prev ? { ...prev, skin: next } : null))
        }
        onEquip={async (side, catalogSkinId) => {
          const item =
            items.find((i) => i.id === catalogSkinId) ?? workspaceCatalogItem;
          if (item) await handleEquip(item, side);
        }}
        onUnequip={async (side) => {
          if (!workspace?.skin) return;
          await handleUnequip(workspace.skin.catalogSkinId, side);
        }}
        onSaved={() => {
          void fetchLoadout({ silent: true });
        }}
      />
    </section>
  );
}

export function InventoryPreview() {
  const t = useTranslations("inventory");
  const { user, loading: userLoading } = useUser();
  const [loadout, setLoadout] = useState<LoadoutResponse | null>(null);
  const { previewSkin, openPreview, closePreview, isPreviewOpen } = useSkinPreview();

  useEffect(() => {
    if (!user) {
      setLoadout(null);
      return;
    }
    fetch("/api/inventory/loadout", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setLoadout(data))
      .catch(() => setLoadout(null));
  }, [user?.id]);

  const equipped = loadout?.items ?? [];

  if (userLoading || !user) {
    return null;
  }

  if (equipped.length === 0) {
    return <p className="text-sm text-muted">{t("noneEquipped")}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {equipped.slice(0, 10).map((item) => (
          <InventorySkinTile
            key={item.catalogSkinId}
            name={item.name}
            imageUrl={item.imageUrl}
            accent={item.accent}
            rarity={item.rarity}
            equippedT={item.equippedT}
            equippedCT={item.equippedCT}
            onClick={() => openPreview(loadoutItemToPreview(item))}
          />
        ))}
      </div>
      <SkinPreviewModal open={isPreviewOpen} skin={previewSkin} onClose={closePreview} />
    </>
  );
}
