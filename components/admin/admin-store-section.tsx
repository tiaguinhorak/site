"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Plus, Pencil, Trash2, Loader2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { formatPriceCents } from "@/lib/serializers";
import {
  DEFAULT_GRADIENT,
  STORE_BADGE_PRESETS,
  STORE_TYPE_PRESETS,
  findGradientByClasses,
} from "@/lib/admin/content-presets";
import { GradientPicker } from "@/components/admin/pickers/gradient-picker";
import { PresetSelect } from "@/components/admin/pickers/preset-select";
import { ImagePicker } from "@/components/admin/pickers/image-picker";
import { CurrencyInput } from "@/components/admin/pickers/currency-input";
import { RemoteImage } from "@/components/ui/remote-image";
import { AdminStoreRewardsEditor } from "@/components/admin/admin-store-rewards-editor";
import { cn } from "@/lib/utils";

type StoreProductKind = "SKIN" | "PACKAGE" | "CASE" | "AGENT";

type StoreReward = {
  id: string;
  kind: "CATALOG_SKIN" | "AGENT" | "STICKER";
  catalogSkinId: string | null;
  agentDefIndex: number | null;
  stickerDefIndex?: number | null;
  weight: number;
  quantity: number;
  sortOrder: number;
  label?: string | null;
  imageUrl?: string | null;
  catalogSkin?: {
    weaponId?: string;
    paintkit?: number;
    weaponName: string;
    paintkitName: string;
    imageUrl?: string | null;
    category?: string;
    rarity?: string;
  } | null;
};

type StoreItem = {
  id: string;
  name: string;
  type: string;
  productKind: StoreProductKind;
  priceCents: number;
  originalCents: number | null;
  coinPrice: number | null;
  badge: string;
  description: string;
  accent: string;
  imageUrl: string | null;
  enabled: boolean;
  trending: boolean;
  featured: boolean;
  sortOrder: number;
  maxPerUser: number | null;
  rewards?: StoreReward[];
};

const PRODUCT_KIND_OPTIONS: StoreProductKind[] = ["SKIN", "PACKAGE", "CASE", "AGENT"];

const PRODUCT_KIND_LABELS: Record<StoreProductKind, string> = {
  SKIN: "Skin única",
  PACKAGE: "Pacote",
  CASE: "Caixa",
  AGENT: "Agente",
};

const emptyForm: {
  name: string;
  type: string;
  productKind: StoreProductKind;
  priceCents: number;
  originalCents: number;
  coinPrice: string;
  badge: string;
  description: string;
  accent: string;
  imageUrl: string;
  enabled: boolean;
  trending: boolean;
  featured: boolean;
  sortOrder: string;
  maxPerUser: string;
} = {
  name: "",
  type: STORE_TYPE_PRESETS[0],
  productKind: "SKIN" as StoreProductKind,
  priceCents: 0,
  originalCents: 0,
  coinPrice: "",
  badge: STORE_BADGE_PRESETS[0],
  description: "",
  accent: DEFAULT_GRADIENT.classes,
  imageUrl: "",
  enabled: true,
  trending: false,
  featured: false,
  sortOrder: "0",
  maxPerUser: "",
};

export function AdminStoreSection() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/store", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
  }

  function openEdit(item: StoreItem) {
    setEditing(item);
    setForm({
      name: item.name,
      type: item.type,
      productKind: item.productKind,
      priceCents: item.priceCents,
      originalCents: item.originalCents ?? 0,
      coinPrice: item.coinPrice != null ? String(item.coinPrice) : "",
      badge: item.badge,
      description: item.description,
      accent: item.accent,
      imageUrl: item.imageUrl ?? "",
      enabled: item.enabled,
      trending: item.trending,
      featured: item.featured,
      sortOrder: String(item.sortOrder),
      maxPerUser: item.maxPerUser != null ? String(item.maxPerUser) : "",
    });
    setError(null);
    setSuccess(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      name: form.name,
      type: form.type,
      productKind: form.productKind,
      priceCents: form.priceCents,
      originalCents: form.originalCents > 0 ? form.originalCents : null,
      coinPrice: form.coinPrice.trim() ? Number(form.coinPrice) : null,
      badge: form.badge,
      description: form.description,
      accent: form.accent,
      imageUrl: form.imageUrl.trim() || null,
      enabled: form.enabled,
      trending: form.trending,
      featured: form.featured,
      sortOrder: Number(form.sortOrder),
      maxPerUser: form.maxPerUser ? Number(form.maxPerUser) : null,
    };
    const result = editing
      ? await secureApi<{ ok: true; item: StoreItem }>(`/api/admin/store/${editing.id}`, {
          method: "PATCH",
          json: payload,
        })
      : await secureApi<{ ok: true; item: StoreItem }>("/api/admin/store", {
          method: "POST",
          json: payload,
        });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!editing) {
      setEditing(result.data.item);
      setSuccess("Item criado. Configure as recompensas abaixo.");
    } else {
      setSuccess("Item salvo.");
    }
    load();
  }

  async function remove(id: string) {
    const result = await secureApi(`/api/admin/store/${id}`, { method: "DELETE" });
    if (result.ok) {
      if (editing?.id === id) openCreate();
      load();
    }
  }

  const previewGradient = findGradientByClasses(form.accent);
  const editingRewards = editing?.rewards ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Loja — Admin
          </h1>
          <p className="mt-1 text-sm text-muted">
            Crie itens, configure recompensas (skins, agentes, stickers) e publique na loja.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo item
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Lista de itens */}
        <section className="rounded-card glass-strong p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold">Itens ({items.length})</h2>
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Novo
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 motion-safe-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border py-10 text-center">
              <Package className="mx-auto h-10 w-10 text-muted opacity-40" />
              <p className="mt-3 text-sm text-muted">Nenhum item na loja.</p>
              <Button type="button" variant="primary" size="sm" className="mt-4" onClick={openCreate}>
                Criar primeiro item
              </Button>
            </div>
          ) : (
            <ul className="mt-3 max-h-[min(70vh,640px)] space-y-2 overflow-y-auto pr-1">
              {items.map((item) => {
                const active = editing?.id === item.id;
                return (
                  <li key={item.id}>
                    <div
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl border p-2 sm:gap-3 sm:p-3",
                        active
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/60 hover:border-border hover:bg-black/10",
                        !item.enabled && "opacity-60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {item.imageUrl ? (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/50">
                            <RemoteImage
                              src={item.imageUrl}
                              alt=""
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/20 text-xs text-muted">
                            —
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="truncate text-[11px] text-muted">
                            {PRODUCT_KIND_LABELS[item.productKind]} · {formatPriceCents(item.priceCents)}
                          </p>
                          <p className="truncate text-[10px] text-muted">
                            {item.rewards?.length ?? 0} recomp. · {item.badge}
                            {!item.enabled ? " · inativo" : ""}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar ${item.name}`}
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Excluir ${item.name}`}
                          confirm={confirmPresets.deleteAction(item.name)}
                          onClick={() => void remove(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-400" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Editor */}
        <section className="rounded-card glass-strong space-y-5 p-5 xl:col-span-3">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            {editing ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-display font-bold">Editar: {editing.name}</h2>
                  <p className="text-xs text-muted">ID {editing.id.slice(0, 8)}…</p>
                </div>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold">Novo item</h2>
              </>
            )}
          </div>

          {!editing && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
              Preencha os dados e clique em &quot;Salvar item&quot;. Depois configure as recompensas.
            </p>
          )}

          <div
            className="relative overflow-hidden rounded-xl border border-border p-3"
            style={{
              background: previewGradient
                ? `linear-gradient(135deg, ${previewGradient.from}22, ${previewGradient.to}33)`
                : undefined,
            }}
          >
            <div className="flex gap-3">
              {form.imageUrl ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60">
                  <RemoteImage
                    src={form.imageUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div>
                <p className="text-[10px] uppercase text-muted">Preview</p>
                <p className="font-display font-bold">{form.name || "Nome do item"}</p>
                <p className="text-xs text-primary">
                  {form.badge} · {PRODUCT_KIND_LABELS[form.productKind]}
                </p>
                <p className="font-display text-lg font-bold">
                  {form.priceCents === 0 ? "Grátis" : formatPriceCents(form.priceCents)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <PresetSelect
              label="Badge"
              value={form.badge}
              onChange={(badge) => setForm({ ...form, badge })}
              options={STORE_BADGE_PRESETS}
            />
            <PresetSelect
              label="Tipo (rótulo)"
              value={form.type}
              onChange={(type) => setForm({ ...form, type })}
              options={STORE_TYPE_PRESETS}
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                Comportamento
              </label>
              <select
                value={form.productKind}
                onChange={(e) => setForm({ ...form, productKind: e.target.value as StoreProductKind })}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
              >
                {PRODUCT_KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {PRODUCT_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>
            <CurrencyInput
              label="Preço"
              valueCents={form.priceCents}
              onChangeCents={(priceCents) => setForm({ ...form, priceCents })}
            />
            <CurrencyInput
              label="Preço original"
              valueCents={form.originalCents}
              onChangeCents={(originalCents) => setForm({ ...form, originalCents })}
              optional
            />
            <Input
              label="Preço em moedas"
              type="number"
              value={form.coinPrice}
              onChange={(e) => setForm({ ...form, coinPrice: e.target.value })}
              placeholder="Não vendável por moedas"
            />
            <Input
              label="Ordem"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
            <Input
              label="Máx. por usuário"
              type="number"
              value={form.maxPerUser}
              onChange={(e) => setForm({ ...form, maxPerUser: e.target.value })}
              placeholder="Ilimitado"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Descrição
            </label>
            <textarea
              value={form.description}
              rows={2}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
            />
          </div>

          <ImagePicker
            label="Imagem do card"
            folder="store"
            value={form.imageUrl}
            onChange={(imageUrl) => setForm({ ...form, imageUrl })}
          />

          <GradientPicker value={form.accent} onChange={(accent) => setForm({ ...form, accent })} />

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Ativo na loja
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.trending}
                onChange={(e) => setForm({ ...form, trending: e.target.checked })}
              />
              Em alta
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              Destaque
            </label>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}

          <div className="flex gap-2">
            <Button type="button" className="flex-1" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : "Salvar item"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={openCreate}>
                Cancelar
              </Button>
            )}
          </div>

          {!editing ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-black/5 p-4 text-center">
              <p className="text-sm font-medium text-muted">Recompensas (skins, agentes, stickers)</p>
              <p className="mt-1 text-xs text-muted">
                Salve o item acima para abrir o catálogo e adicionar recompensas.
              </p>
            </div>
          ) : (
            <AdminStoreRewardsEditor
              key={`${editing.id}-${editingRewards.map((r) => r.id).join(",")}`}
              storeItemId={editing.id}
              productKind={form.productKind}
              initialRewards={editingRewards.map((row) => ({
                kind: row.kind,
                catalogSkinId: row.catalogSkinId,
                agentDefIndex: row.agentDefIndex,
                stickerDefIndex: row.stickerDefIndex ?? null,
                weight: row.weight,
                quantity: row.quantity,
                sortOrder: row.sortOrder,
                label: row.label ?? null,
                imageUrl: row.imageUrl ?? row.catalogSkin?.imageUrl ?? null,
                rarity: row.catalogSkin?.rarity ?? null,
                category:
                  row.kind === "CATALOG_SKIN"
                    ? (row.catalogSkin?.category ?? null)
                    : row.kind === "AGENT"
                      ? "Agente"
                      : row.kind === "STICKER"
                        ? "Sticker"
                        : null,
                weaponId: row.catalogSkin?.weaponId ?? null,
                paintkit: row.catalogSkin?.paintkit ?? null,
              }))}
              onSaved={() => {
                setSuccess("Recompensas salvas.");
                load();
                fetch(`/api/admin/store`, { credentials: "same-origin" })
                  .then((r) => r.json())
                  .then((data) => {
                    const updated = (data.items as StoreItem[]).find((i) => i.id === editing.id);
                    if (updated) setEditing(updated);
                  })
                  .catch(() => undefined);
              }}
              onError={(message) => setError(message)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
