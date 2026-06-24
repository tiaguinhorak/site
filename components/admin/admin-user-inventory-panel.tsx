"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, Search, Send, Trash2 } from "lucide-react";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import {
  adminCatalogItemToPreview,
  grantedSkinToPreview,
} from "@/lib/inventory/skin-preview-mappers";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { cn } from "@/lib/utils";

type GrantedSkin = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  category: string;
  rarity: string;
  accent: string;
  imageUrl: string | null;
};

type CatalogSearchItem = {
  id: string;
  weaponName: string;
  paintkitName: string;
  weaponId: string;
  paintkit: number;
  rarity: string;
  enabled: boolean;
  imageUrl: string | null;
};

function skinDisplayName(item: { weaponName: string; paintkitName: string }): string {
  return `${item.weaponName} | ${item.paintkitName}`;
}

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
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState<GrantedSkin[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const { previewSkin, openPreview, closePreview, isPreviewOpen } = useSkinPreview();

  const loadGranted = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/inventory`, {
      credentials: "same-origin",
    });
    setLoading(false);
    if (!res.ok) {
      onError("Falha ao carregar inventário do jogador.");
      return;
    }
    const data = (await res.json()) as { items?: GrantedSkin[] };
    setGranted(data.items ?? []);
  }, [userId, onError]);

  useEffect(() => {
    void loadGranted();
  }, [loadGranted]);

  async function searchCatalog() {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(
      `/api/admin/catalog-skins?search=${encodeURIComponent(q)}&limit=20&enabledOnly=1`,
      { credentials: "same-origin" },
    );
    setSearching(false);
    if (!res.ok) {
      onError("Busca no catálogo falhou.");
      return;
    }
    const data = (await res.json()) as { items?: CatalogSearchItem[] };
    const grantedIds = new Set(granted.map((g) => g.catalogSkinId));
    setResults((data.items ?? []).filter((item) => !grantedIds.has(item.id)));
  }

  async function grantSkin(catalogSkinId: string, name: string) {
    if (granted.some((g) => g.catalogSkinId === catalogSkinId)) {
      onError("O jogador já possui esta skin.");
      return;
    }
    setActingId(catalogSkinId);
    const result = await secureApi(`/api/admin/users/${userId}/inventory/grant`, {
      method: "POST",
      json: { catalogSkinId },
    });
    setActingId(null);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSuccess(`Skin enviada: ${name}`);
    setSearch("");
    setResults([]);
    await loadGranted();
  }

  async function revokeSkin(catalogSkinId: string, name: string) {
    setActingId(catalogSkinId);
    const result = await secureApi(`/api/admin/users/${userId}/inventory/revoke`, {
      method: "POST",
      json: { catalogSkinId },
    });
    setActingId(null);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSuccess(`Skin removida: ${name}`);
    await loadGranted();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="flex items-center gap-2 font-display font-bold">
          <Search className="h-4 w-4 text-primary" />
          Enviar skin para {nickname}
        </h3>
        <div className="flex gap-2">
          <Input
            label="Buscar skin"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Poseidon, AK-47, Deagle…"
          />
          <Button
            type="button"
            variant="outline"
            disabled={searching || search.trim().length < 2}
            onClick={() => void searchCatalog()}
          >
            {searching ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : "Buscar"}
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {results.map((item) => {
              const name = skinDisplayName(item);
              const accent = rarityAccent(item.rarity);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 p-2 text-sm"
                >
                  <InventoryItemArt
                    imageUrl={item.imageUrl ?? catalogSkinImageUrl(item.id)}
                    accent={accent}
                    className="h-14 w-16 shrink-0"
                    onClick={() => openPreview(adminCatalogItemToPreview(item))}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{name}</p>
                    <p className="text-xs text-muted">{item.weaponId} · pk {item.paintkit}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={actingId === item.id}
                    confirm={confirmPresets.grantSkinToUser(nickname, name)}
                    onClick={() => void grantSkin(item.id, name)}
                  >
                    {actingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 motion-safe-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Enviar
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border p-4">
        <h3 className="flex items-center gap-2 font-display font-bold">
          <Package className="h-4 w-4 text-primary" />
          Skins no inventário ({granted.length})
        </h3>
        {loading ? (
          <div className="flex justify-center py-8 text-muted">
            <Loader2 className="h-5 w-5 motion-safe-spin" />
          </div>
        ) : granted.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nenhuma skin enviada por admin.</p>
        ) : (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {granted.map((item) => (
              <li
                key={item.catalogSkinId}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border/60 p-2 text-sm",
                )}
              >
                <InventoryItemArt
                  imageUrl={item.imageUrl}
                  accent={item.accent}
                  className="h-14 w-16 shrink-0"
                  onClick={() => openPreview(grantedSkinToPreview(item))}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted">{item.category} · {item.rarity}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={actingId === item.catalogSkinId}
                  confirm={confirmPresets.deleteAction(`skin ${item.name}`)}
                  onClick={() => void revokeSkin(item.catalogSkinId, item.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SkinPreviewModal open={isPreviewOpen} skin={previewSkin} onClose={closePreview} />
    </div>
  );
}
