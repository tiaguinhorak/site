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
  weaponSupportsBothTeams,
} from "@/lib/inventory/loadout-team";
import type { RarityKey } from "@/lib/inventory/rarity-tiers";
import {
  EquippedLoadoutGrid,
  type EquippedLoadoutEntry,
} from "@/components/inventory/equipped-loadout-grid";
import { InventorySkinTile } from "@/components/inventory/inventory-skin-tile";
import { SkinRarityFilter } from "@/components/inventory/skin-rarity-filter";
import {
  SkinWorkspace,
  type SkinWorkspaceData,
} from "@/components/inventory/skin-workspace";
import { loadoutItemToPreview } from "@/lib/inventory/skin-preview-mappers";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "@/lib/toast";
import { InventoryPageSkeleton } from "@/components/loading/page-skeletons";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";

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
    owned: item.owned,
    equippedT: item.equippedT,
    equippedCT: item.equippedCT,
  };
}

function loadoutToWorkspace(item: EquippedLoadoutEntry): SkinWorkspaceData {
  return {
    catalogSkinId: item.catalogSkinId,
    name: item.name,
    weaponId: item.weaponId,
    imageUrl: item.imageUrl,
    accent: item.accent,
    rarity: item.rarity,
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
  };
}

function applyLoadoutToCatalogItems(
  items: CatalogSkin[],
  loadoutItems: EquippedLoadoutEntry[],
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

export function InventorySection() {
  const t = useTranslations("inventory");

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
    ],
    [t],
  );

  const [items, setItems] = useState<CatalogSkin[]>([]);
  const [loadout, setLoadout] = useState<LoadoutResponse | null>(null);
  const [dualTeamOnly, setDualTeamOnly] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<RarityKey | "all">("all");
  const [filter, setFilter] = useState<"all" | InventoryCategoryKey>("all");
  const [weaponFilter, setWeaponFilter] = useState("");
  const [weaponOptions, setWeaponOptions] = useState<
    Array<{ weaponId: string; weaponName: string }>
  >([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resultTotal, setResultTotal] = useState(0);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [unequippingId, setUnequippingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [workspace, setWorkspace] = useState<{
    skin: SkinWorkspaceData;
    tab: "settings" | "stickers";
  } | null>(null);
  const [availableRarityTiers, setAvailableRarityTiers] = useState<RarityKey[]>([]);
  const [mounted, setMounted] = useState(false);

  const reqIdRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canGoPrev = mounted && page > 1 && !loading;
  const canGoNext = mounted && page < totalPages && !loading;

  const fetchLoadout = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setRefreshing(true);
    try {
      const response = await fetch("/api/inventory/loadout", {
        credentials: "same-origin",
      });
      if (!response.ok) return null;
      const data = (await response.json()) as LoadoutResponse;
      setLoadout(data);
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
        setLoadout(data);
        setItems((prev) =>
          prev.length > 0 ? applyLoadoutToCatalogItems(prev, data.items) : prev,
        );
      }
    } finally {
      setRefreshing(false);
    }
  }, [pushLoadoutToServer]);

  const fetchSkins = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setLoadError(false);

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
        setLoadError(true);
        return;
      }

      const data = await response.json();
      if (reqId !== reqIdRef.current) return;

      setItems(data.items ?? []);
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
    } catch {
      if (reqId === reqIdRef.current) setLoadError(true);
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setBootstrapped(true);
      }
    }
  }, [filter, page, search, weaponFilter, dualTeamOnly, rarityFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setWeaponFilter("");
    reqIdRef.current += 1;
    setItems([]);
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
    fetchLoadout();
  }, [fetchLoadout]);

  useEffect(() => {
    fetchSkins();
  }, [fetchSkins]);

  const handleEquip = async (item: CatalogSkin, side: EquipSide) => {
    if (!item.owned) return;
    setEquippingId(item.id);
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
      await fetchLoadout({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("equipFailed"));
    } finally {
      setEquippingId(null);
    }
  };

  const handleUnequip = async (
    catalogSkinId: string,
    side: EquipSide,
  ) => {
    setUnequippingId(catalogSkinId);
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
      await fetchLoadout({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("unequipFailed"));
    } finally {
      setUnequippingId(null);
    }
  };

  const openCatalogWorkspace = (
    item: CatalogSkin,
    tab: "settings" | "stickers" = "settings",
  ) => {
    setWorkspace({
      skin: catalogToWorkspace(item, categoryLabels[item.category]),
      tab,
    });
  };

  const openLoadoutWorkspace = (
    item: EquippedLoadoutEntry,
    tab: "settings" | "stickers" = "settings",
  ) => {
    setWorkspace({ skin: loadoutToWorkspace(item), tab });
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
  const showEmptyCatalog = bootstrapped && !loading && !loadError && catalogTotal === 0;
  const showNoResults = bootstrapped && !loading && !loadError && catalogTotal > 0 && items.length === 0;
  const catalogGridLoading = loading && items.length === 0;

  if (!bootstrapped) {
    return <InventoryPageSkeleton />;
  }

  return (
    <section className="space-y-6">
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
                  onClick={() => setFilter(f.id)}
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

          {availableRarityTiers.length > 0 && (
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

          {showDualTeamFilter && (
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

          {weaponOptions.length > 0 && (
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
              <Button type="button" variant="outline" size="sm" onClick={fetchSkins}>
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
          ) : (
            <div
              className={cn(
                "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 transition-opacity",
                loading && "opacity-60",
              )}
            >
              {items.map((item) => {
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
                    onClick={() => openCatalogWorkspace(item)}
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

          {totalPages > 1 && (
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

      <SkinWorkspace
        open={workspace !== null}
        skin={workspace?.skin ?? null}
        initialTab={workspace?.tab}
        actionLoading={
          workspace?.skin.catalogSkinId
            ? equippingId === workspace.skin.catalogSkinId ||
              unequippingId === workspace.skin.catalogSkinId
            : false
        }
        onClose={() => setWorkspace(null)}
        onEquip={async (side) => {
          if (workspaceCatalogItem) await handleEquip(workspaceCatalogItem, side);
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
