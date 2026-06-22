"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type InventoryCategoryKey } from "@/lib/profile";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { cn } from "@/lib/utils";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";

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

type LoadoutItem = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  paintkit: number;
  imageUrl: string | null;
  accent: string;
  equippedAt: string;
};

type LoadoutResponse = {
  steamLinked: boolean;
  steamId: string | null;
  steamId2?: string | null;
  items: LoadoutItem[];
};

type CatalogResponse = {
  items: CatalogSkin[];
  totalPages: number;
  catalogTotal: number;
  total: number;
  weaponOptions?: Array<{ weaponId: string; weaponName: string }>;
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

async function postJson(url: string, body: unknown) {
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
    gameSync?: { ok: boolean; error?: string };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }
  if (payload?.gameSync && !payload.gameSync.ok) {
    throw new Error(
      payload.gameSync.error ??
        "Salvo no site, mas falhou ao enviar ao servidor CS:GO. Tente respawn.",
    );
  }
  return payload;
}

function RarityBar({ accent }: { accent: string }) {
  return (
    <span
      className={cn(
        "absolute inset-x-0 bottom-0 h-1 bg-linear-to-r",
        accent,
      )}
      aria-hidden
    />
  );
}

function EquippedLoadout({
  loadout,
  onRefresh,
  onUnequip,
  unequippingId,
  refreshing,
}: {
  loadout: LoadoutResponse | null;
  onRefresh: () => void;
  onUnequip: (item: LoadoutItem) => void;
  unequippingId: string | null;
  refreshing: boolean;
}) {
  const t = useTranslations("inventory");
  const confirmPresets = useConfirmPresets();

  if (!loadout) return null;

  if (!loadout.steamLinked) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-card border border-amber-500/30 bg-amber-500/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <p className="text-sm text-amber-200">{t("loadoutSteamRequired")}</p>
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-card glass-strong">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {t("loadoutTitle")}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {loadout.steamId2
              ? t("loadoutSteamId2", { steamId: loadout.steamId2 })
              : t("loadoutSteamId", { steamId: loadout.steamId ?? "" })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          {t("loadoutRefresh")}
        </Button>
      </div>

      {loadout.items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{t("loadoutEmpty")}</p>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {loadout.items.map((item) => (
            <div
              key={item.catalogSkinId}
              className="group flex items-center gap-3 rounded-xl bg-black/20 p-3 ring-1 ring-white/5"
            >
              <InventoryItemArt
                imageUrl={item.imageUrl}
                accent={item.accent}
                className="h-12 w-16 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="truncate text-xs text-muted">
                  {item.weaponId.replace(/^weapon_/, "")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 px-2"
                disabled={unequippingId === item.catalogSkinId ? true : undefined}
                confirm={confirmPresets.unequipSkin(item.name)}
                onClick={() => onUnequip(item)}
              >
                {unequippingId === item.catalogSkinId ? t("unequipping") : t("unequip")}
              </Button>
            </div>
          ))}
        </div>
      )}
      <p className="border-t border-border/60 px-5 py-3 text-xs text-muted">
        {t("loadoutHint")}
      </p>
    </div>
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
  const [filter, setFilter] = useState<"all" | InventoryCategoryKey>("all");
  const [weaponFilter, setWeaponFilter] = useState("");
  const [weaponOptions, setWeaponOptions] = useState<
    Array<{ weaponId: string; weaponName: string }>
  >([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resultTotal, setResultTotal] = useState(0);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [unequippingId, setUnequippingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
      const response = await fetch("/api/inventory/loadout", {
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const data = (await response.json()) as LoadoutResponse;
      setLoadout(data);
    } catch {
      // keep previous loadout on transient error
    } finally {
      setRefreshing(false);
    }
  }, []);

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
      if (weaponFilter) params.set("weaponId", weaponFilter);

      const response = await fetch(`/api/inventory/skins?${params}`, {
        credentials: "same-origin",
      });

      // Ignore stale responses: a newer request already superseded this one.
      if (reqId !== reqIdRef.current) return;

      if (!response.ok) {
        setLoadError(true);
        return;
      }

      const data = (await response.json()) as CatalogResponse;
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
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [filter, page, search, weaponFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setWeaponFilter("");
  }, [filter, search]);

  useEffect(() => {
    fetchLoadout();
  }, [fetchLoadout]);

  useEffect(() => {
    fetchSkins();
  }, [fetchSkins]);

  const handleEquip = async (item: CatalogSkin) => {
    if (item.equipped || !item.owned) return;
    setEquipError(null);
    setEquippingId(item.id);
    try {
      await postJson("/api/inventory/equip", { catalogSkinId: item.id });
      setItems((prev) =>
        prev.map((entry) => ({
          ...entry,
          equipped:
            entry.weaponId === item.weaponId ? entry.id === item.id : entry.equipped,
        })),
      );
      await fetchLoadout();
    } catch (err) {
      setEquipError(err instanceof Error ? err.message : "Falha ao equipar skin.");
    } finally {
      setEquippingId(null);
    }
  };

  const handleUnequip = async (catalogSkinId: string, weaponId: string) => {
    setEquipError(null);
    setUnequippingId(catalogSkinId);
    try {
      await postJson("/api/inventory/unequip", { catalogSkinId });
      setItems((prev) =>
        prev.map((entry) =>
          entry.weaponId === weaponId ? { ...entry, equipped: false } : entry,
        ),
      );
      await fetchLoadout();
    } catch (err) {
      setEquipError(err instanceof Error ? err.message : "Falha ao desequipar skin.");
    } finally {
      setUnequippingId(null);
    }
  };

  const showEmptyCatalog = !loading && !loadError && catalogTotal === 0;
  const showNoResults =
    !loading && !loadError && catalogTotal > 0 && items.length === 0;

  return (
    <section>
      <EquippedLoadout
        loadout={loadout}
        onRefresh={fetchLoadout}
        refreshing={refreshing}
        unequippingId={unequippingId}
        onUnequip={(item) => handleUnequip(item.catalogSkinId, item.weaponId)}
      />

      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-1 mb-5 rounded-card glass-strong px-4 py-4 sm:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((f) => {
            const Icon = CATEGORY_ICON[f.id];
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-[0_6px_20px_-8px_var(--glow-1)]"
                    : "glass-input text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {f.label}
              </button>
            );
          })}
        </div>

        {weaponOptions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={() => {
                setWeaponFilter("");
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                weaponFilter === ""
                  ? "bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t("catAllWeapons")}
            </button>
            {weaponOptions.map((weapon) => (
              <button
                key={weapon.weaponId}
                type="button"
                onClick={() => {
                  setWeaponFilter(weapon.weaponId);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  weaponFilter === weapon.weaponId
                    ? "bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {weapon.weaponName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {t("catalogCount", { count: resultTotal, page, totalPages })}
        </p>
        {catalogTotal > 0 && (
          <p className="text-xs text-muted/70">{t("itemsCount", { count: catalogTotal })}</p>
        )}
      </div>

      {equipError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{equipError}</p>
        </div>
      )}

      {/* Grid / states */}
      {loading && items.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-card bg-white/5"
              aria-hidden
            />
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
            "grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            loading && "opacity-60",
          )}
        >
          {items.map((item, i) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-card glass p-4 transition-all hover:-translate-y-0.5 hover:glow-ring-contained",
                item.equipped && "ring-1 ring-emerald-400/40",
              )}
            >
              <div className="relative">
                <InventoryItemArt
                  imageUrl={item.imageUrl}
                  accent={item.accent}
                  className="h-28 w-full"
                />
                <RarityBar accent={item.accent} />
                {item.equipped && (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("equipped")}
                  </span>
                )}
              </div>

              <h3 className="mt-3 line-clamp-2 font-display text-sm font-bold leading-snug text-foreground">
                {item.name}
              </h3>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                {categoryLabels[item.category]} · {item.rarity}
              </p>

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
                onClick={() =>
                  item.equipped
                    ? handleUnequip(item.id, item.weaponId)
                    : handleEquip(item)
                }
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
            </motion.article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
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
    </section>
  );
}

export function InventoryPreview() {
  const t = useTranslations("inventory");
  const [loadout, setLoadout] = useState<LoadoutResponse | null>(null);

  useEffect(() => {
    fetch("/api/inventory/loadout", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setLoadout(data))
      .catch(() => setLoadout(null));
  }, []);

  const equipped = loadout?.items ?? [];

  if (equipped.length === 0) {
    return <p className="text-sm text-muted">{t("noneEquipped")}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {equipped.slice(0, 6).map((item) => (
        <div key={item.catalogSkinId} className="rounded-xl glass p-3">
          <InventoryItemArt imageUrl={item.imageUrl} accent={item.accent} className="h-12" />
          <p className="mt-2 truncate text-sm font-semibold text-foreground">{item.name}</p>
        </div>
      ))}
    </div>
  );
}
