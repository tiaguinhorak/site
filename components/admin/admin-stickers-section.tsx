"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sticker,
  Search,
  Plus,
  Trash2,
  Loader2,
  Download,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { cn } from "@/lib/utils";

type StickerItem = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  stickerType: string | null;
  tournament: string | null;
  enabled: boolean;
  source: string;
};

type LookupPreview = {
  found: boolean;
  api: {
    id: string;
    defIndex: number;
    name: string;
    imageUrl: string | null;
    rarity: string;
  } | null;
  existing: StickerItem | null;
};

export function AdminStickersSection() {
  const [items, setItems] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [enabledOnly, setEnabledOnly] = useState(false);

  const [formDefIndex, setFormDefIndex] = useState("");
  const [preview, setPreview] = useState<LookupPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "30",
      });
      if (search.trim()) params.set("search", search.trim());
      if (enabledOnly) params.set("enabledOnly", "1");

      const res = await fetch(`/api/admin/sticker-catalog?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Falha ao carregar catálogo.");
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [page, search, enabledOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function runLookup() {
    const defIndex = Number(formDefIndex);
    if (!Number.isFinite(defIndex) || defIndex <= 0) {
      setError("Informe um def_index válido.");
      return;
    }
    setError(null);
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({ defIndex: String(defIndex) });
      const res = await fetch(`/api/admin/sticker-catalog/lookup?${params}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as LookupPreview & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Lookup falhou.");
      setPreview(data);
      if (!data.found) {
        setError("Sticker não encontrado na CSGO-API — confira o def_index.");
      }
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Lookup falhou.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function addSticker() {
    const defIndex = Number(formDefIndex);
    if (!Number.isFinite(defIndex) || defIndex <= 0) {
      setError("Informe def_index válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await secureApi("/api/admin/sticker-catalog", {
        method: "POST",
        json: { defIndex, enabled: true },
      });
      setFormDefIndex("");
      setPreview(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar.");
    } finally {
      setSaving(false);
    }
  }

  async function importAll() {
    setImporting(true);
    setError(null);
    try {
      const result = await secureApi<{ imported: number }>("/api/admin/sticker-catalog", {
        method: "POST",
        json: { action: "import-all" },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await load();
      alert(`Importados ${result.data.imported} stickers da CSGO-API.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao importar.");
    } finally {
      setImporting(false);
    }
  }

  async function toggleEnabled(item: StickerItem) {
    try {
      await secureApi(`/api/admin/sticker-catalog/${item.id}`, {
        method: "PATCH",
        json: { enabled: !item.enabled },
      });
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, enabled: !row.enabled } : row,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar.");
    }
  }

  async function deleteItem(item: StickerItem) {
    try {
      await secureApi(`/api/admin/sticker-catalog/${item.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Sticker className="h-6 w-6 text-primary" />
            Catálogo de stickers
          </h1>
          <p className="mt-1 text-sm text-muted">
            Postgres + CSGO-API. Requer plugin CSGO_WeaponStickers + eItems no servidor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={importAll}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 motion-safe-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Importar todos
          </Button>
        </div>
      </div>

      <div className="rounded-card glass-strong p-5">
        <h2 className="text-sm font-semibold text-foreground">Adicionar por def_index</h2>
        <p className="mt-1 text-xs text-muted">
          def_index do sticker na CSGO-API (campo def_index em stickers.json).
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-[160px_auto_auto]">
          <Input
            label="def_index"
            placeholder="Ex: 4071"
            value={formDefIndex}
            onChange={(e) => {
              setFormDefIndex(e.target.value);
              setPreview(null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={previewLoading}
            onClick={runLookup}
          >
            {previewLoading ? (
              <Loader2 className="h-4 w-4 motion-safe-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Preview
          </Button>
          <Button type="button" disabled={saving || !preview?.found} onClick={addSticker}>
            {saving ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </div>

        {preview?.api && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-black/20 p-3 ring-1 ring-white/5">
            {preview.api.imageUrl ? (
              <img src={preview.api.imageUrl} alt="" className="h-12 w-12 object-contain" />
            ) : (
              <div className="h-12 w-12 rounded bg-white/5" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{preview.api.name}</p>
              <p className="text-xs text-muted">
                def_index {preview.api.defIndex} · {preview.api.rarity}
                {preview.existing ? " · já no catálogo" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className="rounded-card glass-strong p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-lg border border-white/10 bg-black/25 py-2 pl-9 pr-3 text-sm"
              placeholder="Buscar sticker…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
            Só ativos
          </label>
        </div>

        <p className="mt-3 text-xs text-muted">
          {total} stickers · página {page}/{totalPages}
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-12 w-12 object-contain" />
                ) : (
                  <div className="h-12 w-12 rounded bg-white/5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted">
                    def_index {item.defIndex} · {item.source}
                    {item.tournament ? ` · ${item.tournament}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleEnabled(item)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    item.enabled
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-muted",
                  )}
                >
                  {item.enabled ? "Ativo" : "Off"}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  confirm={confirmPresets.deleteAction(item.name)}
                  onClick={() => deleteItem(item)}
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
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
    </div>
  );
}
