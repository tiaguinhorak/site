"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search, ZoomIn } from "lucide-react";
import { RemoteImage } from "@/components/ui/remote-image";
import { Button } from "@/components/ui/button";
import {
  StoreRewardPreviewModal,
  type StoreRewardPreviewTarget,
} from "@/components/store/reward-preview-modal";
import { cn } from "@/lib/utils";

export type AgentPickerItem = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  team: string;
  enabled: boolean;
};

export function AgentCatalogPicker({
  onSelect,
  singleSelect = true,
  excludeDefIndexes = [],
  className,
}: {
  onSelect: (item: AgentPickerItem) => void;
  singleSelect?: boolean;
  excludeDefIndexes?: number[];
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState<"" | "T" | "CT">("");
  const [enabledOnly, setEnabledOnly] = useState(false);
  const [items, setItems] = useState<AgentPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewTarget, setPreviewTarget] = useState<StoreRewardPreviewTarget | null>(null);

  const excludedKey = excludeDefIndexes.join(",");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "16" });
      const q = search.trim();
      if (q) params.set("search", q);
      if (team) params.set("team", team);
      if (enabledOnly) params.set("enabledOnly", "1");

      const res = await fetch(`/api/admin/agent-catalog?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Busca falhou.");
      const data = await res.json();
      const excluded = new Set(
        excludedKey ? excludedKey.split(",").map((v) => Number(v)).filter(Boolean) : [],
      );
      setItems(
        (data.items ?? []).filter(
          (row: AgentPickerItem) => !excluded.has(row.defIndex),
        ),
      );
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, team, enabledOnly, page, excludedKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, team, enabledOnly]);

  function openPreview(item: AgentPickerItem) {
    setPreviewTarget({
      type: "agent",
      label: item.name,
      imageUrl: item.imageUrl,
      subLabel: item.team,
    });
  }

  return (
    <div className={cn("space-y-3 rounded-xl border border-border p-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Buscar agente · clique na imagem para preview
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome ou def_index…"
            className="w-full rounded-lg border border-border bg-transparent py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value as "" | "T" | "CT")}
          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Todos times</option>
          <option value="T">Terroristas</option>
          <option value="CT">Counter-Terrorists</option>
        </select>
        <label className="flex items-center gap-2 self-center text-xs text-muted">
          <input
            type="checkbox"
            checked={enabledOnly}
            onChange={(e) => setEnabledOnly(e.target.checked)}
          />
          Só habilitados
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 motion-safe-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          Nenhum agente encontrado. Desmarque &quot;Só habilitados&quot; ou importe no catálogo de agentes.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-muted">{items.length} nesta página</p>
          <ul className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 p-2"
              >
                <button
                  type="button"
                  className="group relative flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/30"
                  onClick={() => openPreview(item)}
                  title="Ver preview"
                >
                  {item.imageUrl ? (
                    <RemoteImage
                      src={item.imageUrl}
                      alt={item.name}
                      width={48}
                      height={56}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-[10px] text-muted">#{item.defIndex}</span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                    <ZoomIn className="h-3.5 w-3.5 text-white" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{item.name}</p>
                  <p className="text-[10px] text-muted">
                    {item.team} · #{item.defIndex}
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
