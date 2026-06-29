"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { RemoteImage } from "@/components/ui/remote-image";
import { Button } from "@/components/ui/button";
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
  className,
}: {
  onSelect: (item: AgentPickerItem) => void;
  singleSelect?: boolean;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState<"" | "T" | "CT">("");
  const [enabledOnly, setEnabledOnly] = useState(true);
  const [items, setItems] = useState<AgentPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    const q = search.trim();
    if (q.length < 1 && !team) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "16" });
      if (q) params.set("search", q);
      if (team) params.set("team", team);
      if (enabledOnly) params.set("enabledOnly", "1");

      const res = await fetch(`/api/admin/agent-catalog?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Busca falhou.");
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, team, enabledOnly, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, team, enabledOnly]);

  return (
    <div className={cn("space-y-3 rounded-xl border border-border p-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Buscar agente</p>

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
        <p className="py-4 text-center text-xs text-muted">Busque um agente pelo nome ou def_index.</p>
      ) : (
        <>
          <ul className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 p-2"
              >
                <div className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/30">
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
                </div>
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
    </div>
  );
}
