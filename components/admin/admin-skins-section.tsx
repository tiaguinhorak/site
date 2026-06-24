"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Loader2,
  Download,
  RefreshCw,
  Wand2,
  Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { adminCatalogItemToPreview } from "@/lib/inventory/skin-preview-mappers";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { cn } from "@/lib/utils";
import { useCatalogImportJob } from "@/components/admin/use-catalog-import-job";

type CatalogItem = {
  id: string;
  weaponId: string;
  weaponName: string;
  paintkit: number;
  paintkitName: string;
  rarity: string;
  category: string;
  imageUrl: string | null;
  enabled: boolean;
  source: string;
  gameClient: "csgo" | "cs2" | "unknown";
};

type WeaponOption = { weaponId: string; weaponName: string };

type LookupPreview = {
  found: boolean;
  api: {
    id: string;
    weaponId: string;
    weaponName: string;
    paintkit: number;
    paintkitName: string;
    imageUrl: string | null;
    rarity: string;
    category: string;
  } | null;
  existing: CatalogItem | null;
  compatibility?: {
    gameClient: "csgo" | "cs2" | "unknown";
    csgoCompatible: boolean;
    reason: string;
  };
};

function GameClientBadge({ gameClient }: { gameClient: CatalogItem["gameClient"] }) {
  if (gameClient === "csgo") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
        CS:GO
      </span>
    );
  }
  if (gameClient === "cs2") {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
        CS2
      </span>
    );
  }
  return null;
}

export function AdminSkinsSection() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [weaponOptions, setWeaponOptions] = useState<WeaponOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [weaponFilter, setWeaponFilter] = useState("");
  const [enabledOnly, setEnabledOnly] = useState(false);

  const [formWeaponId, setFormWeaponId] = useState("weapon_ak47");
  const [formPaintkit, setFormPaintkit] = useState("");
  const [preview, setPreview] = useState<LookupPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { previewSkin, openPreview, closePreview, isPreviewOpen } = useSkinPreview();
  const [error, setError] = useState<string | null>(null);
  const { importing, startImport } = useCatalogImportJob(() => void load());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "30",
        weapons: "1",
      });
      if (search.trim()) params.set("search", search.trim());
      if (weaponFilter) params.set("weaponId", weaponFilter);
      if (enabledOnly) params.set("enabledOnly", "1");

      const res = await fetch(`/api/admin/catalog-skins?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Falha ao carregar catálogo.");
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
      if (Array.isArray(data.weaponOptions)) {
        setWeaponOptions(data.weaponOptions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [page, search, weaponFilter, enabledOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function runLookup() {
    const paintkit = Number(formPaintkit);
    if (!formWeaponId || !Number.isFinite(paintkit) || paintkit <= 0) {
      setError("Informe weaponId e paintkit válido.");
      return;
    }
    setError(null);
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({
        weaponId: formWeaponId,
        paintkit: String(paintkit),
      });
      const res = await fetch(`/api/admin/catalog-skins/lookup?${params}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as LookupPreview & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Lookup falhou.");
      setPreview(data);
      if (!data.found) {
        setError("Paintkit não encontrado na CSGO-API — confira weaponId e índice.");
      }
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Lookup falhou.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function addSkin() {
    const paintkit = Number(formPaintkit);
    if (!formWeaponId || !Number.isFinite(paintkit) || paintkit <= 0) {
      setError("Informe weaponId e paintkit válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await secureApi("/api/admin/catalog-skins", {
        method: "POST",
        json: {
          weaponId: formWeaponId,
          paintkit,
          enabled: true,
        },
      });
      setFormPaintkit("");
      setPreview(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar.");
    } finally {
      setSaving(false);
    }
  }

  async function importWeapon() {
    if (!formWeaponId) return;
    setError(null);
    const result = await startImport("/api/admin/catalog-skins", {
      action: "import-weapon",
      weaponId: formWeaponId,
      enabled: true,
    });
    if (!result.ok) {
      setError(result.error ?? "Falha ao importar.");
      return;
    }
    setPreview(null);
  }

  async function toggleEnabled(item: CatalogItem) {
    try {
      await secureApi(`/api/admin/catalog-skins/${item.id}`, {
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

  async function deleteItem(item: CatalogItem) {
    try {
      await secureApi(`/api/admin/catalog-skins/${item.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover.");
    }
  }

  function downloadCfg() {
    window.open("/api/admin/catalog-skins/export-cfg?download=1", "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Sparkles className="h-6 w-6 text-primary" />
            Catálogo de skins
          </h1>
          <p className="mt-1 text-sm text-muted">
            Postgres + CSGO-API (imagens). Servidor é CS:GO — skins CS2 são bloqueadas automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={downloadCfg}>
            <Download className="h-4 w-4" />
            Export !ws cfg
          </Button>
        </div>
      </div>

      <div className="rounded-card glass-strong p-5">
        <h2 className="text-sm font-semibold text-foreground">Adicionar por paintkit</h2>
        <p className="mt-1 text-xs text-muted">
          Ex.: AK-47 Asiimov — weapon_ak47 + paint index do stash.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_140px_auto_auto]">
          <select
            value={formWeaponId}
            onChange={(e) => {
              setFormWeaponId(e.target.value);
              setPreview(null);
            }}
            className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm"
          >
            {weaponOptions.length === 0 ? (
              <option value={formWeaponId}>{formWeaponId}</option>
            ) : (
              weaponOptions.map((w) => (
                <option key={w.weaponId} value={w.weaponId}>
                  {w.weaponName} ({w.weaponId})
                </option>
              ))
            )}
          </select>
          <Input
            label="Paintkit"
            placeholder="Ex: 661"
            value={formPaintkit}
            onChange={(e) => {
              setFormPaintkit(e.target.value);
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
          <Button
            type="button"
            disabled={saving || preview?.compatibility?.csgoCompatible === false}
            onClick={addSkin}
          >
            {saving ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={importWeapon}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 motion-safe-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            Importar todas desta arma (CSGO-API)
          </Button>
        </div>

        {preview?.api && (
          <div className="mt-4 flex gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <InventoryItemArt
              imageUrl={preview.api.imageUrl}
              accent={rarityAccent(preview.api.rarity)}
              className="h-24 w-32 shrink-0"
              onClick={() =>
                openPreview(
                  adminCatalogItemToPreview({
                    id: preview.api!.id,
                    weaponName: preview.api!.weaponName,
                    paintkitName: preview.api!.paintkitName,
                    paintkit: preview.api!.paintkit,
                    rarity: preview.api!.rarity,
                    category: preview.api!.category,
                    imageUrl: preview.api!.imageUrl,
                  }),
                )
              }
            />
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">
                  {preview.api.weaponName} | {preview.api.paintkitName}
                </p>
                {preview.compatibility && (
                  <GameClientBadge gameClient={preview.compatibility.gameClient} />
                )}
              </div>
              <p className="text-muted">Paintkit {preview.api.paintkit}</p>
              <p className="text-muted">{preview.api.rarity} · {preview.api.category}</p>
              {preview.compatibility && !preview.compatibility.csgoCompatible && (
                <p className="mt-2 text-amber-300">{preview.compatibility.reason}</p>
              )}
              {preview.existing && (
                <p className="mt-2 text-amber-300">Já existe no catálogo (será atualizada).</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        )}
      </div>

      <div className="rounded-card glass-strong p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              label="Buscar"
              className="pl-9"
              placeholder="Buscar skin ou arma…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            value={weaponFilter}
            onChange={(e) => {
              setWeaponFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm"
          >
            <option value="">Todas armas</option>
            {weaponOptions.map((w) => (
              <option key={w.weaponId} value={w.weaponId}>
                {w.weaponName}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={enabledOnly}
              onChange={(e) => {
                setEnabledOnly(e.target.checked);
                setPage(1);
              }}
            />
            Só ativas
          </label>
        </div>

        <p className="mt-3 text-xs text-muted">
          {total} skins · página {page}/{totalPages}
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
                <InventoryItemArt
                  imageUrl={item.imageUrl}
                  accent={rarityAccent(item.rarity)}
                  className="h-12 w-16 shrink-0"
                  onClick={() => openPreview(adminCatalogItemToPreview(item))}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.weaponName} | {item.paintkitName}
                    </p>
                    <GameClientBadge gameClient={item.gameClient} />
                  </div>
                  <p className="text-xs text-muted">
                    {item.weaponId} · pk {item.paintkit} · {item.source}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleEnabled(item)}
                  disabled={item.gameClient === "cs2"}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    item.enabled
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-muted",
                    item.gameClient === "cs2" && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {item.enabled ? "Ativa" : "Off"}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  confirm={confirmPresets.deleteAction(
                    `${item.weaponName} | ${item.paintkitName}`,
                  )}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>

      <SkinPreviewModal open={isPreviewOpen} skin={previewSkin} onClose={closePreview} />
    </div>
  );
}
