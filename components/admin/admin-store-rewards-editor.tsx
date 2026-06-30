"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, ZoomIn } from "lucide-react";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { StickerImage } from "@/components/inventory/sticker-image";
import { RemoteImage } from "@/components/ui/remote-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureApi } from "@/lib/api/client";
import {
  AgentCatalogPicker,
  type AgentPickerItem,
} from "@/components/admin/pickers/agent-catalog-picker";
import {
  CatalogSkinPicker,
  skinDisplayName,
  type CatalogSkinPickerItem,
} from "@/components/admin/pickers/catalog-skin-picker";
import {
  StickerCatalogPicker,
  type StickerPickerItem,
} from "@/components/admin/pickers/sticker-catalog-picker";
import {
  StoreRewardPreviewModal,
  storeRewardItemToPreviewTarget,
  type StoreRewardPreviewTarget,
} from "@/components/store/reward-preview-modal";
import { adminCatalogItemToPreview, storeRewardToPreview } from "@/lib/inventory/skin-preview-mappers";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";

export type RewardDraft = {
  kind: "CATALOG_SKIN" | "AGENT" | "STICKER";
  catalogSkinId?: string | null;
  agentDefIndex?: number | null;
  stickerDefIndex?: number | null;
  weight: number;
  quantity: number;
  sortOrder: number;
  label?: string | null;
  imageUrl?: string | null;
  rarity?: string | null;
  category?: string | null;
  weaponId?: string | null;
  paintkit?: number | null;
};

function kindBadge(kind: RewardDraft["kind"]) {
  switch (kind) {
    case "CATALOG_SKIN":
      return "Skin";
    case "AGENT":
      return "Agente";
    case "STICKER":
      return "Sticker";
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function RewardThumb({ reward, onPreview }: { reward: RewardDraft; onPreview: () => void }) {
  return (
    <button
      type="button"
      className="group relative shrink-0"
      onClick={onPreview}
      title="Ver preview"
    >
      {reward.kind === "CATALOG_SKIN" ? (
        <InventoryItemArt
          imageUrl={
            reward.imageUrl ??
            (reward.catalogSkinId ? catalogSkinImageUrl(reward.catalogSkinId) : null)
          }
          accent={rarityAccent(reward.rarity ?? "common")}
          className="h-11 w-12"
        />
      ) : reward.kind === "STICKER" ? (
        <div className="flex h-11 w-12 items-center justify-center rounded-lg bg-black/30">
          <StickerImage src={reward.imageUrl} alt={reward.label ?? ""} className="h-9 w-9 object-contain" />
        </div>
      ) : (
        <div className="flex h-11 w-12 items-center justify-center overflow-hidden rounded-lg bg-black/30">
          {reward.imageUrl ? (
            <RemoteImage
              src={reward.imageUrl}
              alt={reward.label ?? "Agente"}
              width={48}
              height={44}
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <span className="text-[10px] text-muted">#{reward.agentDefIndex}</span>
          )}
        </div>
      )}
      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition group-hover:opacity-100">
        <ZoomIn className="h-3.5 w-3.5 text-white" />
      </span>
    </button>
  );
}

export function AdminStoreRewardsEditor({
  storeItemId,
  productKind,
  initialRewards,
  onSaved,
  onError,
}: {
  storeItemId: string;
  productKind: "SKIN" | "PACKAGE" | "CASE" | "AGENT";
  initialRewards: RewardDraft[];
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [rewards, setRewards] = useState<RewardDraft[]>(initialRewards);
  const [saving, setSaving] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<StoreRewardPreviewTarget | null>(null);
  const [reserved, setReserved] = useState<{
    catalogSkinIds: string[];
    agentDefIndexes: number[];
    stickerDefIndexes: number[];
  }>({ catalogSkinIds: [], agentDefIndexes: [], stickerDefIndexes: [] });

  useEffect(() => {
    fetch(`/api/admin/store/reserved-rewards?excludeItemId=${storeItemId}`, {
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setReserved({
            catalogSkinIds: data.catalogSkinIds ?? [],
            agentDefIndexes: data.agentDefIndexes ?? [],
            stickerDefIndexes: data.stickerDefIndexes ?? [],
          });
        }
      })
      .catch(() => undefined);
  }, [storeItemId]);

  function appendReward(draft: RewardDraft) {
    setRewards((prev) => [...prev, { ...draft, sortOrder: prev.length }]);
  }

  function addSkinReward(item: CatalogSkinPickerItem) {
    if (rewards.some((r) => r.kind === "CATALOG_SKIN" && r.catalogSkinId === item.id)) {
      onError("Esta skin já está na lista.");
      return;
    }
    if (reserved.catalogSkinIds.includes(item.id)) {
      onError("Esta skin já está em outro item da loja.");
      return;
    }
    appendReward({
      kind: "CATALOG_SKIN",
      catalogSkinId: item.id,
      weight: 100,
      quantity: 1,
      sortOrder: rewards.length,
      label: skinDisplayName(item),
      imageUrl: item.imageUrl ?? catalogSkinImageUrl(item.id),
      rarity: item.rarity,
      category: item.category,
      weaponId: item.weaponId,
      paintkit: item.paintkit,
    });
  }

  function addAgentReward(item: AgentPickerItem) {
    if (rewards.some((r) => r.kind === "AGENT" && r.agentDefIndex === item.defIndex)) {
      onError("Este agente já está na lista.");
      return;
    }
    if (reserved.agentDefIndexes.includes(item.defIndex)) {
      onError("Este personagem já está em outro item da loja.");
      return;
    }
    appendReward({
      kind: "AGENT",
      agentDefIndex: item.defIndex,
      weight: 100,
      quantity: 1,
      sortOrder: rewards.length,
      label: item.name,
      imageUrl: item.imageUrl,
      category: item.team,
    });
  }

  function addStickerReward(item: StickerPickerItem) {
    if (rewards.some((r) => r.kind === "STICKER" && r.stickerDefIndex === item.defIndex)) {
      onError("Este sticker já está na lista.");
      return;
    }
    if (reserved.stickerDefIndexes.includes(item.defIndex)) {
      onError("Este sticker já está em outro item da loja.");
      return;
    }
    appendReward({
      kind: "STICKER",
      stickerDefIndex: item.defIndex,
      weight: 100,
      quantity: 1,
      sortOrder: rewards.length,
      label: item.name,
      imageUrl: item.imageUrl,
      category: "Sticker",
    });
  }

  function openRewardPreview(reward: RewardDraft) {
    if (reward.kind === "CATALOG_SKIN" && reward.catalogSkinId) {
      if (reward.weaponId && reward.paintkit) {
        setPreviewTarget({
          type: "skin",
          data: adminCatalogItemToPreview({
            id: reward.catalogSkinId,
            weaponId: reward.weaponId,
            weaponName: reward.label?.split(" | ")[0] ?? "",
            paintkit: reward.paintkit,
            paintkitName: reward.label?.split(" | ")[1] ?? "",
            rarity: reward.rarity ?? "",
            category: reward.category ?? "",
            imageUrl: reward.imageUrl ?? null,
          }),
        });
      } else {
        const target = storeRewardItemToPreviewTarget({
          kind: reward.kind,
          catalogSkinId: reward.catalogSkinId,
          label: reward.label ?? null,
          imageUrl: reward.imageUrl ?? null,
          subLabel: reward.rarity ?? null,
          toSkinPreview: storeRewardToPreview,
        });
        if (target) setPreviewTarget(target);
      }
      return;
    }

    const target = storeRewardItemToPreviewTarget({
      kind: reward.kind,
      catalogSkinId: reward.catalogSkinId,
      label: reward.label ?? null,
      imageUrl: reward.imageUrl ?? null,
      subLabel: reward.category ?? null,
      toSkinPreview: storeRewardToPreview,
    });
    if (target) setPreviewTarget(target);
  }

  async function saveRewards() {
    if (rewards.length < 1) {
      onError("Adicione ao menos 1 recompensa.");
      return;
    }

    setSaving(true);
    const result = await secureApi<{ rewards: RewardDraft[] }>(
      `/api/admin/store/${storeItemId}/rewards`,
      {
        method: "PUT",
        json: {
          productKind,
          rewards: rewards.map((row, index) => ({
            kind: row.kind,
            catalogSkinId: row.kind === "CATALOG_SKIN" ? row.catalogSkinId : null,
            agentDefIndex: row.kind === "AGENT" ? row.agentDefIndex : null,
            stickerDefIndex: row.kind === "STICKER" ? row.stickerDefIndex : null,
            weight: row.weight,
            quantity: row.quantity,
            sortOrder: row.sortOrder ?? index,
          })),
        },
      },
    );
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onSaved();
  }

  const showWeight = productKind === "CASE";
  const showQuantity = productKind === "PACKAGE";
  const canAddSkin = true;
  const canAddAgent = true;
  const canAddSticker = true;
  const skinExcludeIds = [
    ...rewards
      .filter((r) => r.kind === "CATALOG_SKIN" && r.catalogSkinId)
      .map((r) => r.catalogSkinId!),
    ...reserved.catalogSkinIds,
  ];
  const agentExclude = [
    ...rewards
      .filter((r) => r.kind === "AGENT" && r.agentDefIndex)
      .map((r) => r.agentDefIndex!),
    ...reserved.agentDefIndexes,
  ];
  const stickerExclude = [
    ...rewards
      .filter((r) => r.kind === "STICKER" && r.stickerDefIndex)
      .map((r) => r.stickerDefIndex!),
    ...reserved.stickerDefIndexes,
  ];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-black/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold">Recompensas</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            {productKind === "SKIN" && "Entrega fixa — skins, personagens e stickers"}
            {productKind === "CASE" && "Sorteio 1 item do pool (peso por linha)"}
            {productKind === "PACKAGE" && "Entrega tudo — use quantidade por item"}
            {productKind === "AGENT" && "Entrega fixa — skins, personagens e stickers"}
          </p>
          <p className="mt-1 text-[11px] text-primary/90">
            Skins, personagens e stickers podem ser misturados. Itens já usados em outra listagem ficam ocultos.
          </p>
        </div>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {rewards.length} {rewards.length === 1 ? "item" : "itens"}
        </span>
      </div>

      {rewards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-amber-500/40 px-3 py-4 text-center text-sm text-amber-400/90">
          Nenhuma recompensa — escolha itens nos catálogos abaixo.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rewards.map((reward, index) => (
            <li
              key={`${reward.kind}-${reward.catalogSkinId ?? reward.agentDefIndex ?? reward.stickerDefIndex}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5"
            >
              <RewardThumb reward={reward} onPreview={() => openRewardPreview(reward)} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-snug">{reward.label ?? "Recompensa"}</p>
                <p className="text-[10px] text-muted">{kindBadge(reward.kind)}</p>
              </div>
              {showWeight && (
                <Input
                  label=""
                  type="number"
                  className="w-16 [&_label]:hidden"
                  value={String(reward.weight)}
                  onChange={(e) =>
                    setRewards((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, weight: Number(e.target.value) || 1 } : row,
                      ),
                    )
                  }
                />
              )}
              {showQuantity && (
                <Input
                  label=""
                  type="number"
                  className="w-14 [&_label]:hidden"
                  value={String(reward.quantity)}
                  onChange={(e) =>
                    setRewards((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, quantity: Number(e.target.value) || 1 } : row,
                      ),
                    )
                  }
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRewards((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {canAddSkin && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
            Skins de armas — clique em adicionar
          </p>
          <CatalogSkinPicker
            onSelect={addSkinReward}
            excludeIds={skinExcludeIds}
            singleSelect={false}
          />
        </div>
      )}

      {canAddAgent && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Personagens (agentes) — clique em adicionar
          </p>
          <AgentCatalogPicker
            onSelect={addAgentReward}
            excludeDefIndexes={agentExclude}
            singleSelect={false}
          />
        </div>
      )}

      {canAddSticker && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">
            Stickers / cosméticos — clique em adicionar
          </p>
          <StickerCatalogPicker
            onSelect={addStickerReward}
            excludeDefIndexes={stickerExclude}
          />
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={saving || rewards.length < 1}
        onClick={() => void saveRewards()}
      >
        {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : "Salvar recompensas"}
      </Button>

      <StoreRewardPreviewModal
        open={previewTarget != null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
