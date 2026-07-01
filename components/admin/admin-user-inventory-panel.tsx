"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Search,
  Send,
  Trash2,
  UserRound,
  Tags,
  X,
} from "lucide-react";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import {
  adminCatalogItemToPreview,
  grantedSkinToPreview,
} from "@/lib/inventory/skin-preview-mappers";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { cn } from "@/lib/utils";

type GrantTab = "skins" | "agents" | "stickers";

type GrantedSkin = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  category: string;
  rarity: string;
  accent: string;
  imageUrl: string | null;
};

type SkinCatalogRow = {
  id: string;
  weaponId: string;
  weaponName: string;
  paintkitName: string;
  paintkit: number;
  rarity: string;
  category: string;
  imageUrl: string | null;
  name: string;
  accent: string;
  ownedByUser: boolean;
};

type EconomyCatalogRow = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  subLabel: string | null;
  ownedByUser: boolean;
};

type EconomyGrantedRow = {
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  subLabel: string | null;
};

type OwnershipFilter = "all" | "owned" | "missing";
type CategoryFilter = "all" | "knife" | "gloves" | "rifle" | "pistol" | "smg";

const GRANT_TABS: { id: GrantTab; label: string; icon: typeof Package }[] = [
  { id: "skins", label: "Skins", icon: Package },
  { id: "agents", label: "Agentes", icon: UserRound },
  { id: "stickers", label: "Stickers", icon: Tags },
];

const SKIN_CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "knife", label: "Facas" },
  { id: "gloves", label: "Luvas" },
  { id: "rifle", label: "Rifles" },
  { id: "pistol", label: "Pistolas" },
  { id: "smg", label: "SMGs" },
];

const OWNERSHIP_FILTERS: { id: OwnershipFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "missing", label: "Não possui" },
  { id: "owned", label: "Já possui" },
];

const AGENT_TEAM_FILTERS = [
  { id: "all", label: "Todos times" },
  { id: "T", label: "TR" },
  { id: "CT", label: "CT" },
] as const;

export function AdminUserInventoryPanel({
  userId,
  nickname,
  onSuccess,
  onError,
}: {
  userId: string;
  nickname: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [tab, setTab] = useState<GrantTab>("skins");

  const [loadingGranted, setLoadingGranted] = useState(true);
  const [grantedSkins, setGrantedSkins] = useState<GrantedSkin[]>([]);
  const [grantedEconomy, setGrantedEconomy] = useState<EconomyGrantedRow[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [ownership, setOwnership] = useState<OwnershipFilter>("missing");
  const [agentTeam, setAgentTeam] = useState<"all" | "T" | "CT">("all");
  const [weaponId, setWeaponId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [ownedCount, setOwnedCount] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [skinCatalogItems, setSkinCatalogItems] = useState<SkinCatalogRow[]>([]);
  const [economyCatalogItems, setEconomyCatalogItems] = useState<EconomyCatalogRow[]>([]);
  const [weaponOptions, setWeaponOptions] = useState<
    Array<{ weaponId: string; weaponName: string }>
  >([]);
  const [selectedSkinIds, setSelectedSkinIds] = useState<Set<string>>(new Set());
  const [selectedDefIndexes, setSelectedDefIndexes] = useState<Set<number>>(new Set());
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [bulkGranting, setBulkGranting] = useState(false);

  const { previewSkin, openPreview, closePreview, isPreviewOpen } = useSkinPreview();

  const grantedSkinIds = useMemo(
    () => new Set(grantedSkins.map((g) => g.catalogSkinId)),
    [grantedSkins],
  );
  const grantedDefIndexes = useMemo(
    () => new Set(grantedEconomy.map((g) => g.defIndex)),
    [grantedEconomy],
  );

  const economyKind = tab === "agents" ? "AGENT" : "STICKER";

  const loadGrantedSkins = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${userId}/inventory`, {
      credentials: "same-origin",
    });
    if (!res.ok) {
      onError("Falha ao carregar inventário de skins.");
      return;
    }
    const data = (await res.json()) as { items?: GrantedSkin[] };
    setGrantedSkins(data.items ?? []);
  }, [userId, onError]);

  const loadGrantedEconomy = useCallback(async () => {
    const res = await fetch(
      `/api/admin/users/${userId}/inventory/economy?kind=${economyKind}&view=granted`,
      { credentials: "same-origin" },
    );
    if (!res.ok) {
      onError(`Falha ao carregar ${tab === "agents" ? "agentes" : "stickers"} do jogador.`);
      return;
    }
    const data = (await res.json()) as { items?: EconomyGrantedRow[] };
    setGrantedEconomy(data.items ?? []);
  }, [userId, economyKind, tab, onError]);

  const loadGranted = useCallback(async () => {
    setLoadingGranted(true);
    if (tab === "skins") {
      await loadGrantedSkins();
    } else {
      await loadGrantedEconomy();
    }
    setLoadingGranted(false);
  }, [tab, loadGrantedSkins, loadGrantedEconomy]);

  const loadSkinCatalog = useCallback(async () => {
    setCatalogLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "36",
      category,
      ownership,
      search,
      weapons: page === 1 ? "1" : "0",
    });
    if (weaponId) params.set("weaponId", weaponId);

    const res = await fetch(
      `/api/admin/users/${userId}/inventory/catalog?${params}`,
      { credentials: "same-origin" },
    );
    setCatalogLoading(false);
    if (!res.ok) {
      onError("Falha ao carregar catálogo de skins.");
      return;
    }
    const data = (await res.json()) as {
      items?: SkinCatalogRow[];
      totalPages?: number;
      total?: number;
      ownedCount?: number;
      weaponOptions?: Array<{ weaponId: string; weaponName: string }>;
    };
    setSkinCatalogItems(data.items ?? []);
    setTotalPages(data.totalPages ?? 1);
    setTotal(data.total ?? 0);
    setOwnedCount(data.ownedCount ?? 0);
    if (page === 1 && data.weaponOptions) {
      setWeaponOptions(data.weaponOptions);
    }
  }, [userId, page, category, ownership, search, weaponId, onError]);

  const loadEconomyCatalog = useCallback(async () => {
    setCatalogLoading(true);
    const params = new URLSearchParams({
      kind: economyKind,
      page: String(page),
      limit: "36",
      ownership,
      search,
    });
    if (tab === "agents" && agentTeam !== "all") {
      params.set("team", agentTeam);
    }

    const res = await fetch(
      `/api/admin/users/${userId}/inventory/economy?${params}`,
      { credentials: "same-origin" },
    );
    setCatalogLoading(false);
    if (!res.ok) {
      onError(`Falha ao carregar catálogo de ${tab === "agents" ? "agentes" : "stickers"}.`);
      return;
    }
    const data = (await res.json()) as {
      items?: EconomyCatalogRow[];
      totalPages?: number;
      total?: number;
      ownedCount?: number;
    };
    setEconomyCatalogItems(data.items ?? []);
    setTotalPages(data.totalPages ?? 1);
    setTotal(data.total ?? 0);
    setOwnedCount(data.ownedCount ?? 0);
  }, [userId, page, ownership, search, agentTeam, economyKind, tab, onError]);

  const loadCatalog = useCallback(async () => {
    if (tab === "skins") await loadSkinCatalog();
    else await loadEconomyCatalog();
  }, [tab, loadSkinCatalog, loadEconomyCatalog]);

  useEffect(() => {
    void loadGranted();
  }, [loadGranted]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setSelectedSkinIds(new Set());
    setSelectedDefIndexes(new Set());
  }, [search, category, ownership, weaponId, agentTeam, tab]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  function toggleSkinSelect(id: string, owned: boolean) {
    if (owned) return;
    setSelectedSkinIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDefIndexSelect(defIndex: number, owned: boolean) {
    if (owned) return;
    setSelectedDefIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(defIndex)) next.delete(defIndex);
      else next.add(defIndex);
      return next;
    });
  }

  function selectAllMissingOnPage() {
    if (tab === "skins") {
      setSelectedSkinIds((prev) => {
        const next = new Set(prev);
        for (const item of skinCatalogItems) {
          if (!item.ownedByUser && !grantedSkinIds.has(item.id)) next.add(item.id);
        }
        return next;
      });
      return;
    }
    setSelectedDefIndexes((prev) => {
      const next = new Set(prev);
      for (const item of economyCatalogItems) {
        if (!item.ownedByUser && !grantedDefIndexes.has(item.defIndex)) {
          next.add(item.defIndex);
        }
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedSkinIds(new Set());
    setSelectedDefIndexes(new Set());
  }

  const selectedCount = tab === "skins" ? selectedSkinIds.size : selectedDefIndexes.size;

  async function grantSelected() {
    setBulkGranting(true);
    let result;

    if (tab === "skins") {
      const ids = [...selectedSkinIds].filter((id) => !grantedSkinIds.has(id));
      if (ids.length === 0) {
        setBulkGranting(false);
        onError("Selecione skins que o jogador ainda não possui.");
        return;
      }
      result = await secureApi<{ grantedCount: number; skippedCount: number }>(
        `/api/admin/users/${userId}/inventory/grant-bulk`,
        { method: "POST", json: { catalogSkinIds: ids } },
      );
    } else {
      const defIndexes = [...selectedDefIndexes].filter(
        (defIndex) => !grantedDefIndexes.has(defIndex),
      );
      if (defIndexes.length === 0) {
        setBulkGranting(false);
        onError(
          `Selecione ${tab === "agents" ? "agentes" : "stickers"} que o jogador ainda não possui.`,
        );
        return;
      }
      result = await secureApi<{ grantedCount: number; skippedCount: number }>(
        `/api/admin/users/${userId}/inventory/grant-bulk`,
        {
          method: "POST",
          json:
            tab === "agents"
              ? { agentDefIndexes: defIndexes }
              : { stickerDefIndexes: defIndexes },
        },
      );
    }

    setBulkGranting(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }

    const label = tab === "skins" ? "skin(s)" : tab === "agents" ? "agente(s)" : "sticker(s)";
    onSuccess(
      `${result.data.grantedCount} ${label} enviado(s)` +
        (result.data.skippedCount > 0
          ? ` · ${result.data.skippedCount} já possuíam`
          : ""),
    );
    clearSelection();
    await Promise.all([loadGranted(), loadCatalog()]);
  }

  async function grantSkinOne(item: SkinCatalogRow) {
    if (item.ownedByUser || grantedSkinIds.has(item.id)) {
      onError("O jogador já possui esta skin.");
      return;
    }
    setActingKey(item.id);
    const result = await secureApi(`/api/admin/users/${userId}/inventory/grant`, {
      method: "POST",
      json: { catalogSkinId: item.id },
    });
    setActingKey(null);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSuccess(`Skin enviada: ${item.name}`);
    await Promise.all([loadGranted(), loadCatalog()]);
  }

  async function grantEconomyOne(item: EconomyCatalogRow) {
    if (item.ownedByUser || grantedDefIndexes.has(item.defIndex)) {
      onError(`O jogador já possui este ${tab === "agents" ? "agente" : "sticker"}.`);
      return;
    }
    const key = String(item.defIndex);
    setActingKey(key);
    const result = await secureApi(`/api/admin/users/${userId}/inventory/economy`, {
      method: "POST",
      json: { kind: economyKind, defIndex: item.defIndex },
    });
    setActingKey(null);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSuccess(`${tab === "agents" ? "Agente" : "Sticker"} enviado: ${item.name}`);
    await Promise.all([loadGranted(), loadCatalog()]);
  }

  async function revokeSkin(catalogSkinId: string, name: string) {
    setActingKey(catalogSkinId);
    const result = await secureApi(`/api/admin/users/${userId}/inventory/revoke`, {
      method: "POST",
      json: { catalogSkinId },
    });
    setActingKey(null);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSuccess(`Skin removida: ${name}`);
    await Promise.all([loadGranted(), loadCatalog()]);
  }

  async function revokeEconomy(defIndex: number, name: string) {
    setActingKey(String(defIndex));
    const result = await secureApi(`/api/admin/users/${userId}/inventory/economy`, {
      method: "DELETE",
      json: { kind: economyKind, defIndex },
    });
    setActingKey(null);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSuccess(`${tab === "agents" ? "Agente" : "Sticker"} removido: ${name}`);
    await Promise.all([loadGranted(), loadCatalog()]);
  }

  const catalogLabel =
    tab === "skins" ? "skin(s)" : tab === "agents" ? "agente(s)" : "sticker(s)";
  const grantedCount =
    tab === "skins" ? grantedSkins.length : grantedEconomy.length;
  const searchPlaceholder =
    tab === "skins"
      ? "AK-47, Poseidon, Deagle…"
      : tab === "agents"
        ? "SAS, Phoenix, def_index…"
        : "Holo, Gold, def_index…";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {GRANT_TABS.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                tab === entry.id
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/10 text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display font-bold">
              <Search className="h-4 w-4 text-primary" />
              Catálogo — enviar {catalogLabel} para {nickname}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {ownedCount} {catalogLabel} no inventário · {total} no catálogo filtrado
            </p>
          </div>
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">{selectedCount} selecionada(s)</span>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={bulkGranting}
                confirm={confirmPresets.grantSkinToUser(
                  nickname,
                  `${selectedCount} ${catalogLabel}`,
                )}
                onClick={() => void grantSelected()}
              >
                {bulkGranting ? (
                  <Loader2 className="h-3.5 w-3.5 motion-safe-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Enviar selecionadas
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            label="Buscar"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
          />
          <div className="flex gap-2 sm:items-end">
            <Button type="button" variant="outline" size="sm" onClick={selectAllMissingOnPage}>
              Selecionar página
            </Button>
          </div>
        </div>

        {tab === "skins" && (
          <div className="flex flex-wrap gap-2">
            {SKIN_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  category === cat.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/10 text-muted hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {tab === "agents" && (
          <div className="flex flex-wrap gap-2">
            {AGENT_TEAM_FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setAgentTeam(entry.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  agentTeam === entry.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/10 text-muted hover:text-foreground",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {OWNERSHIP_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setOwnership(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                ownership === f.id
                  ? "bg-violet-500/20 text-violet-300"
                  : "bg-muted/10 text-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {tab === "skins" && weaponOptions.length > 0 && (
          <select
            value={weaponId}
            onChange={(e) => setWeaponId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas armas</option>
            {weaponOptions.map((w) => (
              <option key={w.weaponId} value={w.weaponId}>
                {w.weaponName}
              </option>
            ))}
          </select>
        )}

        {catalogLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 motion-safe-spin" />
          </div>
        ) : tab === "skins" ? (
          skinCatalogItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Nenhuma skin encontrada.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {skinCatalogItems.map((item) => {
                const owned = item.ownedByUser || grantedSkinIds.has(item.id);
                const isSelected = selectedSkinIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-2 text-sm transition-colors",
                      owned
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60",
                    )}
                  >
                    <button
                      type="button"
                      disabled={owned}
                      onClick={() => toggleSkinSelect(item.id, owned)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        owned
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                          : isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                      )}
                    >
                      {(owned || isSelected) && <Check className="h-3 w-3" />}
                    </button>
                    <InventoryItemArt
                      imageUrl={item.imageUrl}
                      accent={item.accent}
                      className="h-14 w-16 shrink-0"
                      onClick={() =>
                        openPreview(
                          adminCatalogItemToPreview({
                            id: item.id,
                            weaponName: item.weaponName,
                            paintkitName: item.paintkitName,
                            weaponId: item.weaponId,
                            paintkit: item.paintkit,
                            rarity: item.rarity,
                            imageUrl: item.imageUrl,
                          }),
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.weaponId}
                        {owned ? " · possui" : ""}
                      </p>
                    </div>
                    {!owned && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={actingKey === item.id || bulkGranting}
                        onClick={() => void grantSkinOne(item)}
                      >
                        {actingKey === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 motion-safe-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : economyCatalogItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Nenhum {tab === "agents" ? "agente" : "sticker"} encontrado.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {economyCatalogItems.map((item) => {
              const owned = item.ownedByUser || grantedDefIndexes.has(item.defIndex);
              const isSelected = selectedDefIndexes.has(item.defIndex);
              const accent =
                tab === "agents" ? "from-violet-600 to-fuchsia-600" : "from-amber-500 to-orange-600";
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-2 text-sm transition-colors",
                    owned
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60",
                  )}
                >
                  <button
                    type="button"
                    disabled={owned}
                    onClick={() => toggleDefIndexSelect(item.defIndex, owned)}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      owned
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                        : isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                    )}
                  >
                    {(owned || isSelected) && <Check className="h-3 w-3" />}
                  </button>
                  <InventoryItemArt
                    imageUrl={item.imageUrl}
                    accent={accent}
                    className="h-14 w-16 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted">
                      #{item.defIndex}
                      {item.subLabel ? ` · ${item.subLabel}` : ""}
                      {owned ? " · possui" : ""}
                    </p>
                  </div>
                  {!owned && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={actingKey === String(item.defIndex) || bulkGranting}
                      onClick={() => void grantEconomyOne(item)}
                    >
                      {actingKey === String(item.defIndex) ? (
                        <Loader2 className="h-3.5 w-3.5 motion-safe-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || catalogLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-xs text-muted">
              Página {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || catalogLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-4">
        <h3 className="flex items-center gap-2 font-display font-bold">
          {tab === "skins" ? (
            <Package className="h-4 w-4 text-primary" />
          ) : tab === "agents" ? (
            <UserRound className="h-4 w-4 text-primary" />
          ) : (
            <Tags className="h-4 w-4 text-primary" />
          )}
          Inventário do jogador — {catalogLabel} ({grantedCount})
        </h3>
        {loadingGranted ? (
          <div className="flex justify-center py-8 text-muted">
            <Loader2 className="h-5 w-5 motion-safe-spin" />
          </div>
        ) : grantedCount === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nenhum {tab === "skins" ? "item" : tab === "agents" ? "agente" : "sticker"} no inventário.
          </p>
        ) : tab === "skins" ? (
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {grantedSkins.map((item) => (
              <li
                key={item.catalogSkinId}
                className="flex items-center gap-3 rounded-lg border border-border/60 p-2 text-sm"
              >
                <InventoryItemArt
                  imageUrl={item.imageUrl}
                  accent={item.accent}
                  className="h-14 w-16 shrink-0"
                  onClick={() => openPreview(grantedSkinToPreview(item))}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.category} · {item.rarity}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={actingKey === item.catalogSkinId}
                  confirm={confirmPresets.deleteAction(`skin ${item.name}`)}
                  onClick={() => void revokeSkin(item.catalogSkinId, item.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {grantedEconomy.map((item) => {
              const accent =
                tab === "agents" ? "from-violet-600 to-fuchsia-600" : "from-amber-500 to-orange-600";
              return (
                <li
                  key={item.defIndex}
                  className="flex items-center gap-3 rounded-lg border border-border/60 p-2 text-sm"
                >
                  <InventoryItemArt
                    imageUrl={item.imageUrl}
                    accent={accent}
                    className="h-14 w-16 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted">
                      #{item.defIndex}
                      {item.subLabel ? ` · ${item.subLabel}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={actingKey === String(item.defIndex)}
                    confirm={confirmPresets.deleteAction(
                      `${tab === "agents" ? "agente" : "sticker"} ${item.name}`,
                    )}
                    onClick={() => void revokeEconomy(item.defIndex, item.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SkinPreviewModal open={isPreviewOpen} skin={previewSkin} onClose={closePreview} />
    </div>
  );
}
