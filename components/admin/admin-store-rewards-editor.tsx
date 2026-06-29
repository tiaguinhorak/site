"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
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
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";

export type RewardDraft = {
  kind: "CATALOG_SKIN" | "AGENT";
  catalogSkinId?: string | null;
  agentDefIndex?: number | null;
  weight: number;
  quantity: number;
  sortOrder: number;
  label?: string | null;
  imageUrl?: string | null;
  rarity?: string | null;
  category?: string | null;
};

function RewardRowPreview({ reward }: { reward: RewardDraft }) {
  if (reward.kind === "CATALOG_SKIN") {
    const image = reward.imageUrl ?? (reward.catalogSkinId ? catalogSkinImageUrl(reward.catalogSkinId) : null);
    return (
      <InventoryItemArt
        imageUrl={image}
        accent={rarityAccent(reward.rarity ?? "common")}
        className="h-14 w-16 shrink-0"
      />
    );
  }

  return (
    <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30">
      {reward.imageUrl ? (
        <RemoteImage
          src={reward.imageUrl}
          alt={reward.label ?? "Agente"}
          width={64}
          height={56}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span className="text-[10px] text-muted">#{reward.agentDefIndex}</span>
      )}
    </div>
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

  function addSkinReward(item: CatalogSkinPickerItem) {
    const draft: RewardDraft = {
      kind: "CATALOG_SKIN",
      catalogSkinId: item.id,
      weight: 100,
      quantity: 1,
      sortOrder: productKind === "SKIN" ? 0 : rewards.length,
      label: skinDisplayName(item),
      imageUrl: item.imageUrl ?? catalogSkinImageUrl(item.id),
      rarity: item.rarity,
      category: item.category,
    };

    if (productKind === "SKIN") {
      setRewards([draft]);
    } else {
      setRewards((prev) => [...prev, { ...draft, sortOrder: prev.length }]);
    }
  }

  function addAgentReward(item: AgentPickerItem) {
    const draft: RewardDraft = {
      kind: "AGENT",
      agentDefIndex: item.defIndex,
      weight: 100,
      quantity: 1,
      sortOrder: productKind === "AGENT" ? 0 : rewards.length,
      label: item.name,
      imageUrl: item.imageUrl,
      category: item.team,
    };

    if (productKind === "AGENT") {
      setRewards([draft]);
    } else {
      setRewards((prev) => [...prev, { ...draft, sortOrder: prev.length }]);
    }
  }

  function removeReward(index: number) {
    setRewards((prev) => prev.filter((_, i) => i !== index));
  }

  function updateReward(index: number, patch: Partial<RewardDraft>) {
    setRewards((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function saveRewards() {
    setSaving(true);
    const result = await secureApi<{ rewards: RewardDraft[] }>(
      `/api/admin/store/${storeItemId}/rewards`,
      {
        method: "PUT",
        json: {
          rewards: rewards.map((row, index) => ({
            kind: row.kind,
            catalogSkinId: row.kind === "CATALOG_SKIN" ? row.catalogSkinId : null,
            agentDefIndex: row.kind === "AGENT" ? row.agentDefIndex : null,
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
  const canAddSkin = productKind !== "AGENT";
  const canAddAgent = productKind === "AGENT" || productKind === "PACKAGE";
  const skinExcludeIds = rewards
    .filter((r) => r.kind === "CATALOG_SKIN" && r.catalogSkinId)
    .map((r) => r.catalogSkinId!);

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div>
        <h3 className="font-display text-sm font-bold">Recompensas</h3>
        <p className="mt-1 text-xs text-muted">
          {productKind === "SKIN" && "Uma skin fixa entregue na compra."}
          {productKind === "CASE" && "Pool de skins com peso para sorteio."}
          {productKind === "PACKAGE" && "Várias recompensas entregues juntas."}
          {productKind === "AGENT" && "Um agente equipado na compra (se Steam vinculada)."}
        </p>
      </div>

      {rewards.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma recompensa configurada.</p>
      ) : (
        <ul className="space-y-2">
          {rewards.map((reward, index) => (
            <li
              key={`${reward.kind}-${reward.catalogSkinId ?? reward.agentDefIndex}-${index}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <RewardRowPreview reward={reward} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{reward.label ?? "Recompensa"}</p>
                {reward.category && (
                  <p className="text-[11px] text-muted">{reward.category}</p>
                )}
              </div>
              {showWeight && (
                <Input
                  label="Peso"
                  type="number"
                  className="w-24"
                  value={String(reward.weight)}
                  onChange={(e) =>
                    updateReward(index, { weight: Number(e.target.value) || 1 })
                  }
                />
              )}
              {showQuantity && (
                <Input
                  label="Qtd"
                  type="number"
                  className="w-20"
                  value={String(reward.quantity)}
                  onChange={(e) =>
                    updateReward(index, { quantity: Number(e.target.value) || 1 })
                  }
                />
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => removeReward(index)}>
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {canAddSkin && (
        <CatalogSkinPicker
          onSelect={addSkinReward}
          excludeIds={skinExcludeIds}
          singleSelect={productKind === "SKIN"}
        />
      )}

      {canAddAgent && (
        <AgentCatalogPicker
          onSelect={addAgentReward}
          singleSelect={productKind === "AGENT"}
        />
      )}

      <Button type="button" disabled={saving} onClick={() => void saveRewards()}>
        {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : "Salvar recompensas"}
      </Button>
    </div>
  );
}
