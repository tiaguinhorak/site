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
  CheckCircle2,
  AlertTriangle,
  PackageOpen,
  Sticker,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type InventoryCategoryKey } from "@/lib/profile";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { cn } from "@/lib/utils";
import {
  chipInactiveHoverClass,
  surfaceInputClass,
  surfaceSubtleClass,
  teamPillClass,
  textWarningClass,
} from "@/lib/ui/theme-surfaces";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { RemoteImage } from "@/components/ui/remote-image";
import {
  SkinPreviewModal,
  type SkinPreviewData,
} from "@/components/skins/skin-preview-modal";
import { SkinRarityBadge } from "@/components/skins/skin-rarity-badge";
import { SkinRarityLegend } from "@/components/skins/skin-rarity-legend";
import { SkinRarityLine } from "@/components/skins/skin-rarity-line";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import {
  catalogSkinToPreview,
  loadoutItemToPreview,
} from "@/lib/inventory/skin-preview-mappers";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "@/lib/toast";
import { InventoryPageSkeleton } from "@/components/loading/page-skeletons";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import {
  WeaponStickerModal,
  weaponSupportsStickers,
} from "@/components/dashboard/weapon-sticker-modal";

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
  owned: boolean;
};

type LoadoutSticker = {
  slot: number;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

type LoadoutItem = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  paintkit: number;
  imageUrl: string | null;
  rarity: string;
  accent: string;
  team: LoadoutTeam;
  equippedAt: string;
  stickers: LoadoutSticker[];
};

type LoadoutResponse = {
  steamLinked: boolean;
  steamId: string | null;
  steamId2?: string | null;
  items: LoadoutItem[];
};

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
    throw new Error(payload.gameSync.error ?? partialSyncMessage);
  }
  return payload;
}

function LoadoutStickerRow({
  stickers,
  label,
}: {
  stickers: LoadoutSticker[];
  label: string;
}) {
  if (stickers.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Sticker className="h-3 w-3 shrink-0" />
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {stickers.map((sticker) => (
          <div
            key={`${sticker.slot}-${sticker.defIndex}`}
            title={sticker.name}
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-black/35"
          >
            {sticker.imageUrl ? (
              <RemoteImage
                src={sticker.imageUrl}
                alt=""
                fill
                sizes="40px"
                className="object-contain p-0.5"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                <Sticker className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EquippedSidebar({
  loadout,
  team,
  onRefresh,
  onUnequip,
  onPreview,
  onStickers,
  unequippingId,
  refreshing,
}: {
  loadout: LoadoutResponse | null;
  team: LoadoutTeam;
  onRefresh: () => void;
  onUnequip: (item: LoadoutItem) => void;
  onPreview: (item: LoadoutItem) => void;
  onStickers: (item: LoadoutItem) => void;
  unequippingId: string | null;
  refreshing: boolean;
}) {
  const t = useTranslations("inventory");
  const confirmPresets = useConfirmPresets();

  if (!loadout) return null;

  const teamLabel = team === "T" ? t("teamT") : t("teamCT");
  const sideItems = loadout.items.filter((item) => item.team === team);

  return (
    <aside className="lg:w-80 shrink-0">
      <div className="rounded-card glass-strong lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {t("loadoutSidebarTeam", { team: teamLabel })}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={onRefresh} aria-label={t("retry")}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "motion-safe-spin")} />
          </Button>
        </div>

        {!loadout.steamLinked ? (
          <p className={cn("px-4 py-5 text-xs leading-relaxed", textWarningClass)}>
            {t("loadoutSteamRequired")}
          </p>
        ) : sideItems.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">{t("loadoutEmpty")}</p>
        ) : (
          <ul className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto p-3">
            {sideItems.map((item) => {
              const supportsStickers = weaponSupportsStickers(item.weaponId);
              const isUnequipping = unequippingId === item.catalogSkinId;

              return (
                <li
                  key={`${item.team}-${item.catalogSkinId}`}
                  className={cn(
                    "rounded-xl border border-border/50 p-3 shadow-sm",
                    surfaceSubtleClass,
                  )}
                >
                  <div className="flex gap-3">
                    <InventoryItemArt
                      imageUrl={item.imageUrl}
                      accent={item.accent}
                      className="h-16 w-[4.5rem] shrink-0"
                      onClick={() => onPreview(item)}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => onPreview(item)}
                        className="line-clamp-2 text-left text-sm font-semibold leading-snug text-foreground hover:text-primary"
                      >
                        {item.name}
                      </button>
                      <SkinRarityBadge rarity={item.rarity} accent={item.accent} />
                    </div>
                  </div>

                  <LoadoutStickerRow stickers={item.stickers} label={t("stickersShort")} />

                  <div
                    className={cn(
                      "mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3",
                      supportsStickers ? "justify-between" : "justify-end",
                    )}
                  >
                    {supportsStickers && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-0 flex-1 normal-case tracking-normal"
                        onClick={() => onStickers(item)}
                      >
                        <Sticker className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t("stickersShort")}</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "normal-case tracking-normal text-muted hover:text-foreground",
                        supportsStickers ? "shrink-0" : "w-full justify-center",
                      )}
                      disabled={isUnequipping ? true : undefined}
                      confirm={confirmPresets.unequipSkin(item.name)}
                      onClick={() => onUnequip(item)}
                    >
                      {isUnequipping ? "…" : t("unequip")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {loadout.steamLinked && (
          <p className="border-t border-border/60 px-4 py-2.5 text-[10px] leading-relaxed text-muted">
            {loadout.steamId2
              ? t("loadoutSteamId2", { steamId: loadout.steamId2 })
              : t("loadoutSteamId", { steamId: loadout.steamId ?? "" })}
          </p>
        )}
      </div>
    </aside>
  );
}

export function InventorySection() {
  const t = useTranslations("inventory");
  const confirmPresets = useConfirmPresets();

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
  const [loadoutTeam, setLoadoutTeam] = useState<LoadoutTeam>("CT");
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
  const [previewSkin, setPreviewSkin] = useState<SkinPreviewData | null>(null);
  const [stickerTarget, setStickerTarget] = useState<LoadoutItem | null>(null);
  const [mounted, setMounted] = useState(false);

  const reqIdRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canGoPrev = mounted && page > 1 && !loading;
  const canGoNext = mounted && page < totalPages && !loading;

  const fetchLoadout = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/inventory/loadout?team=${loadoutTeam}`, {
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const data = (await response.json()) as LoadoutResponse;
      setLoadout(data);
    } finally {
      setRefreshing(false);
    }
  }, [loadoutTeam]);

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
      } else if (payload?.gameSync?.error) {
        throw new Error(payload.gameSync.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("syncLoadoutFailed"));
    }
  }, [t]);

  const refreshLoadoutAndServer = useCallback(async () => {
    setRefreshing(true);
    try {
      await pushLoadoutToServer();
      const response = await fetch(`/api/inventory/loadout?team=${loadoutTeam}`, {
        credentials: "same-origin",
      });
      if (response.ok) {
        const data = (await response.json()) as LoadoutResponse;
        setLoadout(data);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadoutTeam, pushLoadoutToServer]);

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
        team: loadoutTeam,
      });
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
    } catch {
      if (reqId === reqIdRef.current) setLoadError(true);
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setBootstrapped(true);
      }
    }
  }, [filter, page, search, weaponFilter, loadoutTeam]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setWeaponFilter("");
    reqIdRef.current += 1;
    setItems([]);
    setPreviewSkin((prev) => (prev ? { ...prev, equipped: false } : null));
  }, [filter, search, loadoutTeam]);

  useEffect(() => {
    if (!previewSkin?.id) return;
    const match = items.find((entry) => entry.id === previewSkin.id);
    setPreviewSkin((prev) => {
      if (!prev || prev.id !== previewSkin.id) return prev;
      const equipped = match?.equipped ?? false;
      if (prev.equipped === equipped) return prev;
      return { ...prev, equipped };
    });
  }, [items, previewSkin?.id]);

  useEffect(() => {
    fetchLoadout();
  }, [fetchLoadout]);

  useEffect(() => {
    fetchSkins();
  }, [fetchSkins]);

  const handleEquip = async (item: CatalogSkin) => {
    if (!item.owned) return;
    setEquippingId(item.id);
    try {
      const payload = await postJson("/api/inventory/equip", {
        catalogSkinId: item.id,
        team: loadoutTeam,
      }, t("gameSyncPartial"));
      if (payload?.gameSync?.ok) {
        toast.success(
          payload.gameSync.applyMode === "immediate"
            ? t("gameSyncImmediate")
            : t("gameSyncStaged"),
        );
      }
      await fetchLoadout();
      await fetchSkins();
      setPreviewSkin((prev) =>
        prev?.id === item.id ? { ...prev, equipped: true } : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("equipFailed"));
    } finally {
      setEquippingId(null);
    }
  };

  const handleUnequip = async (catalogSkinId: string, weaponId: string) => {
    setUnequippingId(catalogSkinId);
    try {
      const payload = await postJson("/api/inventory/unequip", {
        catalogSkinId,
        team: loadoutTeam,
      }, t("gameSyncPartial"));
      if (payload?.gameSync?.ok) {
        toast.success(
          payload.gameSync.applyMode === "immediate"
            ? t("gameSyncImmediate")
            : t("gameSyncStaged"),
        );
      }
      await fetchLoadout();
      await fetchSkins();
      setPreviewSkin((prev) =>
        prev?.id === catalogSkinId ? { ...prev, equipped: false } : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("unequipFailed"));
    } finally {
      setUnequippingId(null);
    }
  };

  const openCatalogPreview = (item: CatalogSkin) => {
    setPreviewSkin(
      catalogSkinToPreview({
        ...item,
        category: categoryLabels[item.category],
      }),
    );
  };

  const openLoadoutPreview = (item: LoadoutItem) => {
    setPreviewSkin(loadoutItemToPreview(item));
  };

  const showEmptyCatalog = bootstrapped && !loading && !loadError && catalogTotal === 0;
  const showNoResults = bootstrapped && !loading && !loadError && catalogTotal > 0 && items.length === 0;
  const catalogGridLoading = loading && items.length === 0;

  if (!bootstrapped) {
    return <InventoryPageSkeleton />;
  }

  return (
    <section>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <EquippedSidebar
          loadout={loadout}
          team={loadoutTeam}
          onRefresh={refreshLoadoutAndServer}
          refreshing={refreshing}
          unequippingId={unequippingId}
          onUnequip={(item) => handleUnequip(item.catalogSkinId, item.weaponId)}
          onPreview={openLoadoutPreview}
          onStickers={(item) => setStickerTarget(item)}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-4 rounded-card glass-strong p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {(["CT", "T"] as const).map((team) => {
                const active = loadoutTeam === team;
                const label = team === "T" ? t("teamT") : t("teamCT");
                return (
                  <button
                    key={team}
                    type="button"
                    onClick={() => setLoadoutTeam(team)}
                    className={cn(
                      "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                      teamPillClass(team, active),
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

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

            <SkinRarityLegend className="mt-3 border-t border-border/50 pt-3" />
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} className="h-56" />
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
                "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 transition-opacity",
                loading && "opacity-60",
              )}
            >
              {items.map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    openCatalogPreview(item);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openCatalogPreview(item);
                    }
                  }}
                  className={cn(
                    "relative flex flex-col overflow-hidden rounded-card glass cursor-pointer transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    item.equipped && "ring-1 ring-emerald-400/35",
                  )}
                >
                  <SkinRarityLine accent={item.accent} rarity={item.rarity} />
                  <div className="flex flex-col p-3">
                    <InventoryItemArt
                      imageUrl={item.imageUrl}
                      accent={item.accent}
                      className="h-28 w-full"
                      priority={false}
                    />
                    <h3 className="mt-2 line-clamp-2 text-sm font-bold text-foreground">
                      {item.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted">
                        {categoryLabels[item.category]}
                      </span>
                      <SkinRarityBadge rarity={item.rarity} accent={item.accent} />
                    </div>
                    <Button
                      type="button"
                      variant={item.equipped ? "outline" : "primary"}
                      size="sm"
                      className="mt-3 w-full"
                      disabled={
                        equippingId === item.id ||
                        unequippingId === item.id ||
                        (!item.equipped && !item.owned)
                          ? true
                          : undefined
                      }
                      confirm={
                        item.equipped
                          ? confirmPresets.unequipSkin(item.name)
                          : confirmPresets.equipSkin(item.name)
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.equipped) {
                          handleUnequip(item.id, item.weaponId);
                        } else {
                          handleEquip(item);
                        }
                      }}
                    >
                      {item.equipped
                        ? unequippingId === item.id
                          ? t("unequipping")
                          : t("unequip")
                        : equippingId === item.id
                          ? t("equipping")
                          : !item.owned
                            ? t("equipUnavailable")
                            : t("equip")}
                    </Button>
                  </div>
                  {item.equipped && (
                    <span className="absolute right-2 top-3 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-black">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </article>
              ))}
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
      </div>

      <SkinPreviewModal
        open={previewSkin !== null}
        skin={previewSkin}
        onClose={() => setPreviewSkin(null)}
        actionLoading={
          previewSkin?.id
            ? equippingId === previewSkin.id || unequippingId === previewSkin.id
            : false
        }
        onEquip={
          previewSkin?.id && !previewSkin.equipped
            ? () => {
                const item = items.find((i) => i.id === previewSkin.id);
                if (item) handleEquip(item);
              }
            : undefined
        }
        onUnequip={
          previewSkin?.id && previewSkin.equipped
            ? () => {
                const item = items.find((i) => i.id === previewSkin.id);
                if (item) handleUnequip(item.id, item.weaponId);
                else if (loadout?.items.some((l) => l.catalogSkinId === previewSkin.id)) {
                  const li = loadout.items.find((l) => l.catalogSkinId === previewSkin.id);
                  if (li) handleUnequip(li.catalogSkinId, li.weaponId);
                }
              }
            : undefined
        }
      />

      <WeaponStickerModal
        open={stickerTarget !== null}
        weaponId={stickerTarget?.weaponId ?? ""}
        weaponName={stickerTarget?.name ?? ""}
        team={loadoutTeam}
        onClose={() => setStickerTarget(null)}
        onSaved={() => void fetchLoadout()}
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {equipped.slice(0, 6).map((item) => (
          <button
            key={`${item.team}-${item.catalogSkinId}`}
            type="button"
            onClick={() => openPreview(loadoutItemToPreview(item))}
            className="rounded-xl glass p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <InventoryItemArt imageUrl={item.imageUrl} accent={item.accent} className="h-12" />
            <p className="mt-2 truncate text-sm font-semibold text-foreground">{item.name}</p>
          </button>
        ))}
      </div>
      <SkinPreviewModal open={isPreviewOpen} skin={previewSkin} onClose={closePreview} />
    </>
  );
}
