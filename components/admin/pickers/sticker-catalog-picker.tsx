"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search, ZoomIn } from "lucide-react";
import { StickerImage } from "@/components/inventory/sticker-image";
import { Button } from "@/components/ui/button";
import {
  StoreRewardPreviewModal,
  type StoreRewardPreviewTarget,
} from "@/components/store/reward-preview-modal";
import { cn } from "@/lib/utils";

export type StickerPickerItem = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  effect: string | null;
  enabled: boolean;
};

export function StickerCatalogPicker({
  onSelect,
  excludeDefIndexes = [],
  className,
}: {
  onSelect: (item: StickerPickerItem) => void;
  excludeDefIndexes?: number[];
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [enabledOnly, setEnabledOnly] = useState(false);
  const [items, setItems] = useState<StickerPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewTarget, setPreviewTarget] = useState<StoreRewardPreviewTarget | null>(null);

  const excludedKey = excludeDefIndexes.join(",");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      const q = search.trim();
      if (q.length >= 2) params.set("search", q);
      if (enabledOnly) params.set("enabledOnly", "1");

      const res = await fetch(`/api/admin/sticker-catalog?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Busca falhou.");
      const data = await res.json();
      const excluded = new Set(
        excludedKey ? excludedKey.split(",").map((v) => Number(v)).filter(Boolean) : [],
      );
      setItems(
        (data.items ?? []).filter(
          (row: StickerPickerItem) => !excluded.has(row.defIndex),
        ),
      );
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, enabledOnly, page, excludedKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, enabledOnly]);

  function openPreview(item: StickerPickerItem) {
    setPreviewTarget({
      type: "sticker",
      label: item.name,
      imageUrl: item.imageUrl,
    });
  }

  return (
    <div className={cn("space-y-3 rounded-xl border border-border p-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Buscar sticker · clique na imagem para preview
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Katowice, Holo, def_index…"
          className="w-full rounded-lg border border-border bg-transparent py-2 pl-9 pr-3 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={enabledOnly}
          onChange={(e) => setEnabledOnly(e.target.checked)}
        />
        Só habilitados no catálogo
      </label>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 motion-safe-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          Nenhum sticker encontrado. Desmarque &quot;Só habilitados&quot; ou importe no catálogo de stickers.
        </p>
      ) : (
        <>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 p-2"
              >
                <button
                  type="button"
                  className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-black/30"
                  onClick={() => openPreview(item)}
                  title="Ver preview"
                >
                  <StickerImage src={item.imageUrl} alt={item.name} className="h-9 w-9 object-contain" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                    <ZoomIn className="h-3 w-3 text-white" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-[11px] text-muted">#{item.defIndex}</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => onSelect(item)}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </li>
            ))}
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

      <StoreRewardPreviewModal
        open={previewTarget != null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
