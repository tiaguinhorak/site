"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureApi } from "@/lib/api/client";

type RewardDraft = {
  kind: "CATALOG_SKIN" | "AGENT";
  catalogSkinId?: string | null;
  agentDefIndex?: number | null;
  weight: number;
  quantity: number;
  sortOrder: number;
  label?: string | null;
};

type CatalogSearchItem = {
  id: string;
  weaponName: string;
  paintkitName: string;
};

function skinLabel(item: CatalogSearchItem): string {
  return `${item.weaponName} | ${item.paintkitName}`;
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
  const [skinSearch, setSkinSearch] = useState("");
  const [skinResults, setSkinResults] = useState<CatalogSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [agentDefIndex, setAgentDefIndex] = useState("");
  const [saving, setSaving] = useState(false);

  async function searchSkins() {
    const q = skinSearch.trim();
    if (q.length < 2) {
      setSkinResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(
      `/api/admin/catalog-skins?search=${encodeURIComponent(q)}&limit=15&enabledOnly=1`,
      { credentials: "same-origin" },
    );
    setSearching(false);
    if (!res.ok) {
      onError("Busca no catálogo falhou.");
      return;
    }
    const data = (await res.json()) as { items?: CatalogSearchItem[] };
    setSkinResults(data.items ?? []);
  }

  function addSkinReward(item: CatalogSearchItem) {
    if (productKind === "SKIN" && rewards.length >= 1) {
      setRewards([
        {
          kind: "CATALOG_SKIN",
          catalogSkinId: item.id,
          weight: 100,
          quantity: 1,
          sortOrder: 0,
          label: skinLabel(item),
        },
      ]);
    } else {
      setRewards((prev) => [
        ...prev,
        {
          kind: "CATALOG_SKIN",
          catalogSkinId: item.id,
          weight: 100,
          quantity: 1,
          sortOrder: prev.length,
          label: skinLabel(item),
        },
      ]);
    }
    setSkinResults([]);
    setSkinSearch("");
  }

  function addAgentReward() {
    const defIndex = Number(agentDefIndex);
    if (!Number.isFinite(defIndex) || defIndex <= 0) {
      onError("Def index do agente inválido.");
      return;
    }
    if (productKind === "AGENT") {
      setRewards([
        {
          kind: "AGENT",
          agentDefIndex: defIndex,
          weight: 100,
          quantity: 1,
          sortOrder: 0,
          label: `Agente #${defIndex}`,
        },
      ]);
    } else {
      setRewards((prev) => [
        ...prev,
        {
          kind: "AGENT",
          agentDefIndex: defIndex,
          weight: 100,
          quantity: 1,
          sortOrder: prev.length,
          label: `Agente #${defIndex}`,
        },
      ]);
    }
    setAgentDefIndex("");
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
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="flex-1 font-medium">
                {reward.label ??
                  (reward.kind === "CATALOG_SKIN"
                    ? reward.catalogSkinId
                    : `Agente #${reward.agentDefIndex}`)}
              </span>
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
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              label="Buscar skin no catálogo"
              value={skinSearch}
              onChange={(e) => setSkinSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchSkins();
              }}
            />
            <Button type="button" variant="outline" className="mt-6" onClick={() => void searchSkins()}>
              {searching ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : "Buscar"}
            </Button>
          </div>
          {skinResults.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {skinResults.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white/5"
                    onClick={() => addSkinReward(item)}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {skinLabel(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {canAddAgent && productKind === "PACKAGE" && (
        <div className="flex gap-2">
          <Input
            label="Def index do agente"
            type="number"
            value={agentDefIndex}
            onChange={(e) => setAgentDefIndex(e.target.value)}
          />
          <Button type="button" variant="outline" className="mt-6" onClick={addAgentReward}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {productKind === "AGENT" && (
        <div className="flex gap-2">
          <Input
            label="Def index do agente"
            type="number"
            value={agentDefIndex}
            onChange={(e) => setAgentDefIndex(e.target.value)}
          />
          <Button type="button" variant="outline" className="mt-6" onClick={addAgentReward}>
            Definir agente
          </Button>
        </div>
      )}

      <Button type="button" disabled={saving} onClick={() => void saveRewards()}>
        {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : "Salvar recompensas"}
      </Button>
    </div>
  );
}
