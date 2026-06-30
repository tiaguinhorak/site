"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";
import { Button } from "@/components/ui/button";
import {
  catalogPickerCategoryOptions,
  type CatalogPickerCategory,
  rarityAccent,
} from "@/lib/inventory/catalog-categories";
import { adminCatalogItemToPreview } from "@/lib/inventory/skin-preview-mappers";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { cn } from "@/lib/utils";

export type CatalogSkinPickerItem = {
  id: string;
  weaponId: string;
  weaponName: string;
  paintkit: number;
  paintkitName: string;
  rarity: string;
  category: string;
  imageUrl: string | null;
  enabled: boolean;
};

type WeaponOption = { weaponId: string; weaponName: string };

function skinDisplayName(item: { weaponName: string; paintkitName: string }): string {
  return `${item.weaponName} | ${item.paintkitName}`;
}

export function CatalogSkinPicker({
  onSelect,
  excludeIds = [],
  singleSelect = false,
  className,
}: {
  onSelect: (item: CatalogSkinPickerItem) => void;
  excludeIds?: string[];
  singleSelect?: boolean;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CatalogPickerCategory>("all");
  const [weaponFilter, setWeaponFilter] = useState("");
  const [weaponOptions, setWeaponOptions] = useState<WeaponOption[]>([]);
  const [enabledOnly, setEnabledOnly] = useState(false);
  const [items, setItems] = useState<CatalogSkinPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { previewSkin, openPreview, closePreview, isPreviewOpen } = useSkinPreview();

  const excludedKey = excludeIds.join(",");

  const load = useCallback(async () => {
    const q = search.trim();

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        weapons: "1",
        category,
      });
      if (q.length >= 2) params.set("search", q);
      if (weaponFilter) params.set("weaponId", weaponFilter);
      if (enabledOnly) params.set("enabledOnly", "1");

      const res = await fetch(`/api/admin/catalog-skins?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Busca falhou.");
      const data = await res.json();
      const excluded = new Set(excludedKey ? excludedKey.split(",") : []);
      setItems((data.items ?? []).filter((row: CatalogSkinPickerItem) => !excluded.has(row.id)));
      setTotalPages(data.totalPages ?? 1);
      if (Array.isArray(data.weaponOptions)) {
        setWeaponOptions(data.weaponOptions);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, weaponFilter, enabledOnly, page, excludedKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, category, weaponFilter, enabledOnly]);

  return (
    <div className={cn("space-y-3 rounded-xl border border-border p-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Buscar skin no catálogo · clique na imagem para preview
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Asiimov, Dragon Lore, luvas…"
            className="w-full rounded-lg border border-border bg-transparent py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CatalogPickerCategory)}
          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        >
          {catalogPickerCategoryOptions().map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={weaponFilter}
          onChange={(e) => setWeaponFilter(e.target.value)}
          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Todas armas</option>
          {weaponOptions.map((w) => (
            <option key={w.weaponId} value={w.weaponId}>
              {w.weaponName}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={enabledOnly}
          onChange={(e) => setEnabledOnly(e.target.checked)}
        />
        Só habilitadas no catálogo
      </label>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 motion-safe-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          Nenhuma skin encontrada. Desmarque &quot;Só habilitadas&quot; ou busque por nome (ex: Asiimov).
        </p>
      ) : (
        <>
          <p className="text-[11px] text-muted">{items.length} nesta página · clique na imagem para preview</p>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const name = skinDisplayName(item);
              const accent = rarityAccent(item.rarity);
              const image = item.imageUrl ?? catalogSkinImageUrl(item.id);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 p-2"
                >
                  <InventoryItemArt
                    imageUrl={image}
                    accent={accent}
                    className="h-14 w-16 shrink-0"
                    onClick={() => openPreview(adminCatalogItemToPreview(item))}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {item.category} · {item.weaponId}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSelect(item);
                      if (singleSelect) {
                        setSearch("");
                        setItems([]);
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {singleSelect ? "Usar" : "Adicionar"}
                  </Button>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span>
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      <SkinPreviewModal open={isPreviewOpen} skin={previewSkin} onClose={closePreview} />
    </div>
  );
}

export { skinDisplayName };
