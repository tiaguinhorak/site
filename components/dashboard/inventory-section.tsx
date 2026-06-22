"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
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

async function equipCatalogSkin(catalogSkinId: string) {
  const response = await fetch("/api/inventory/equip", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-clutchclube-request": "1",
    },
    body: JSON.stringify({ catalogSkinId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Falha ao equipar skin.");
  }

  return response.json();
}

async function unequipCatalogSkin(catalogSkinId: string) {
  const response = await fetch("/api/inventory/unequip", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-clutchclube-request": "1",
    },
    body: JSON.stringify({ catalogSkinId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Falha ao desequipar skin.");
  }

  return response.json();
}

function LoadoutPanel({
  loadout,
  onRefresh,
  onUnequip,
  unequippingId,
}: {
  loadout: LoadoutResponse | null;
  onRefresh: () => void;
  onUnequip: (item: LoadoutItem) => void;
  unequippingId: string | null;
}) {
  const t = useTranslations("inventory");
  const confirmPresets = useConfirmPresets();

  if (!loadout) return null;

  if (!loadout.steamLinked) {
    return (
      <div className="mb-6 rounded-card glass border border-amber-500/30 p-4">
        <p className="text-sm text-amber-200">{t("loadoutSteamRequired")}</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-card glass p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("loadoutTitle")}</p>
          <p className="text-xs text-muted">
            {loadout.steamId2
              ? t("loadoutSteamId2", { steamId: loadout.steamId2 })
              : t("loadoutSteamId", { steamId: loadout.steamId ?? "" })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
          {t("loadoutRefresh")}
        </Button>
      </div>
      {loadout.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t("loadoutEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {loadout.items.map((item) => (
            <li
              key={item.catalogSkinId}
              className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2"
            >
              <InventoryItemArt
                imageUrl={item.imageUrl}
                accent={item.accent}
                className="h-10 w-14 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.weaponId} · paintkit {item.paintkit}
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-400">{t("loadoutConfirmed")}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={unequippingId === item.catalogSkinId ? true : undefined}
                confirm={confirmPresets.unequipSkin(item.name)}
                onClick={() => onUnequip(item)}
              >
                {unequippingId === item.catalogSkinId ? t("unequipping") : t("unequip")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">{t("loadoutHint")}</p>
    </div>
  );
}

export function InventorySection() {
  const t = useTranslations("inventory");
  const confirmPresets = useConfirmPresets();
  const categoryLabels: Record<InventoryCategoryKey, string> = {
    knife: t("catKnife"),
    gloves: t("catGloves"),
    rifle: t("catRifle"),
    pistol: t("catPistol"),
    smg: t("catSmg"),
    agent: t("catAgent"),
  };
  const filters: { id: "all" | InventoryCategoryKey; label: string }[] = [
    { id: "all", label: t("catAll") },
    { id: "knife", label: t("catKnife") },
    { id: "gloves", label: t("catGloves") },
    { id: "rifle", label: t("catRifle") },
    { id: "pistol", label: t("catPistol") },
    { id: "smg", label: t("catSmg") },
  ];

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
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [unequippingId, setUnequippingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canGoPrev = mounted && page > 1 && !loading;
  const canGoNext = mounted && page < totalPages && !loading;

  const fetchLoadout = useCallback(async () => {
    const response = await fetch("/api/inventory/loadout", { credentials: "same-origin" });
    if (!response.ok) return;
    const data = (await response.json()) as LoadoutResponse;
    setLoadout(data);
  }, []);

  const fetchSkins = useCallback(async () => {
    setLoading(true);
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
      if (!response.ok) {
        setItems([]);
        return;
      }
      const data = await response.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setCatalogTotal(data.catalogTotal ?? 0);
      if (page === 1 && Array.isArray(data.weaponOptions)) {
        setWeaponOptions(data.weaponOptions);
      }
    } finally {
      setLoading(false);
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
      await equipCatalogSkin(item.id);
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
      await unequipCatalogSkin(catalogSkinId);
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

  return (
    <section>
      <LoadoutPanel
        loadout={loadout}
        onRefresh={fetchLoadout}
        unequippingId={unequippingId}
        onUnequip={(item) => handleUnequip(item.catalogSkinId, item.weaponId)}
      />

      <div className="mb-4">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary/50 focus:outline-none"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              filter === f.id
                ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {weaponOptions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setWeaponFilter("");
              setPage(1);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              weaponFilter === ""
                ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground"
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
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                weaponFilter === weapon.weaponId
                  ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {weapon.weaponName}
            </button>
          ))}
        </div>
      )}

      <p className="mb-4 text-sm text-muted">
        {t("catalogCount", { count: catalogTotal, page, totalPages })}
      </p>
      {equipError && <p className="mb-4 text-sm text-red-400">{equipError}</p>}

      {loading ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{t("catalogEmpty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              className="relative overflow-hidden rounded-card glass p-5"
            >
              <InventoryItemArt
                imageUrl={item.imageUrl}
                accent={item.accent}
                className="h-20"
              />
              <h3 className="mt-4 font-display font-bold text-foreground line-clamp-2">
                {item.name}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                {categoryLabels[item.category]} · {item.rarity}
              </p>
              <Button
                type="button"
                variant={item.equipped ? "outline" : "primary"}
                size="sm"
                className="mt-4 w-full"
                disabled={
                  equippingId === item.id || unequippingId === item.id || (!item.equipped && !item.owned)
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
                    : t("equip")}
              </Button>
            </motion.article>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoPrev}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t("prevPage")}
        </Button>
        <span className="text-sm text-muted">
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
        </Button>
      </div>
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
          <InventoryItemArt
            imageUrl={item.imageUrl}
            accent={item.accent}
            className="h-12"
          />
          <p className="mt-2 text-sm font-semibold text-foreground truncate">
            {item.name}
          </p>
        </div>
      ))}
    </div>
  );
}
