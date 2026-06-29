"use client";

import { useCallback, useEffect, useState } from "react";
import { UserRound, Search, Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { cn } from "@/lib/utils";
import { useCatalogImportJob } from "@/components/admin/use-catalog-import-job";

type AgentItem = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  team: string;
  enabled: boolean;
  source: string;
};

export function AdminAgentsSection() {
  const [items, setItems] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [enabledOnly, setEnabledOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { importing, startImport } = useCatalogImportJob(() => void load());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (search.trim()) params.set("search", search.trim());
      if (enabledOnly) params.set("enabledOnly", "1");
      const res = await fetch(`/api/admin/agent-catalog?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Falha ao carregar catálogo.");
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [page, search, enabledOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleEnabled(item: AgentItem) {
    const res = await secureApi(`/api/admin/agent-catalog/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    if (!res.ok) {
      setError("Falha ao atualizar agente.");
      return;
    }
    void load();
  }

  async function removeItem(item: AgentItem) {
    const res = await secureApi(`/api/admin/agent-catalog/${item.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Falha ao remover agente.");
      return;
    }
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar agente ou def_index…"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={enabledOnly}
            onChange={(e) => {
              setEnabledOnly(e.target.checked);
              setPage(1);
            }}
          />
          Só habilitados
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={importing}
          onClick={() =>
            startImport("/api/admin/agent-catalog", { action: "import-all" })
          }
        >
          {importing ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Importar CSGO-API
        </Button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 motion-safe-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Agente</th>
                <th className="px-3 py-2">def_index</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted" />
                      {item.name}
                    </div>
                  </td>
                  <td className="px-3 py-2">{item.defIndex}</td>
                  <td className="px-3 py-2">{item.team}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void toggleEnabled(item)}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        item.enabled
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/10 text-muted",
                      )}
                    >
                      {item.enabled ? "Ativo" : "Off"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      confirm={confirmPresets.deleteAction(item.name)}
                      onClick={() => void removeItem(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
