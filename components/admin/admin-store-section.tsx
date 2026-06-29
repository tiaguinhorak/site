"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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

type StoreProductKind = "SKIN" | "PACKAGE" | "CASE" | "AGENT";

type StoreReward = {
  id: string;
  kind: "CATALOG_SKIN" | "AGENT";
  catalogSkinId: string | null;
  agentDefIndex: number | null;
  weight: number;
  quantity: number;
  sortOrder: number;
  label?: string | null;
  imageUrl?: string | null;
  catalogSkin?: { weaponName: string; paintkitName: string; imageUrl?: string | null; category?: string; rarity?: string } | null;
};

type StoreItem = {
  id: string;
  name: string;
  type: string;
  productKind: StoreProductKind;
  priceCents: number;
  originalCents: number | null;
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

const emptyForm: {
  name: string;
  type: string;
  productKind: StoreProductKind;
  priceCents: number;
  originalCents: number;
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
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="rounded-card glass-strong space-y-5 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          {editing ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
          {editing ? "Editar item" : "Novo item"}
        </h2>

        <div
          className="relative overflow-hidden rounded-xl border border-border p-4"
          style={{
            background: previewGradient
              ? `linear-gradient(135deg, ${previewGradient.from}22, ${previewGradient.to}33)`
              : undefined,
          }}
        >
          {form.imageUrl ? (
            <div className="mb-3 overflow-hidden rounded-lg border border-border/60">
              <RemoteImage
                src={form.imageUrl}
                alt={form.name || "Preview"}
                width={400}
                height={160}
                className="h-32 w-full object-cover sm:h-36"
              />
            </div>
          ) : null}
          <p className="text-xs uppercase text-muted">Preview do card</p>
          <p className="mt-1 font-display text-lg font-bold">{form.name || "Nome do item"}</p>
          <p className="text-xs text-primary">
            {form.badge} · {form.productKind}
          </p>
          <p className="mt-2 font-display text-xl font-bold">
            {form.priceCents === 0 ? "Grátis" : formatPriceCents(form.priceCents)}
            {form.originalCents > form.priceCents && form.originalCents > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted line-through">
                {formatPriceCents(form.originalCents)}
              </span>
            ) : null}
          </p>
        </div>

        <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

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
                {kind}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>

        <PresetSelect
          label="Badge"
          value={form.badge}
          onChange={(badge) => setForm({ ...form, badge })}
          options={STORE_BADGE_PRESETS}
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            Descrição
          </label>
          <textarea
            value={form.description}
            rows={3}
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

        <div className="grid grid-cols-2 gap-3">
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Ativo na loja
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.trending}
            onChange={(e) => setForm({ ...form, trending: e.target.checked })}
          />
          Em alta
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          />
          Destaque
        </label>

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

        {editing && (
          <AdminStoreRewardsEditor
            key={`${editing.id}-${editingRewards.map((r) => r.id).join(",")}`}
            storeItemId={editing.id}
            productKind={form.productKind}
            initialRewards={editingRewards.map((row) => ({
              kind: row.kind,
              catalogSkinId: row.catalogSkinId,
              agentDefIndex: row.agentDefIndex,
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
                    : null,
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

      <section className="rounded-card glass-strong p-6 lg:col-span-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Itens ({items.length})
        </h2>
        {loading ? (
          <p className="mt-6 text-center text-muted">Carregando...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pr-4">Capa</th>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Preço</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Recomp.</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className={!item.enabled ? "opacity-60" : undefined}>
                    <td className="py-3 pr-4">
                      {item.imageUrl ? (
                        <div className="h-10 w-14 overflow-hidden rounded-md border border-border/60">
                          <RemoteImage
                            src={item.imageUrl}
                            alt=""
                            width={56}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.badge} · {item.productKind}
                        {!item.enabled ? " · inativo" : ""}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-muted">{formatPriceCents(item.priceCents)}</td>
                    <td className="py-3 pr-4 text-muted">{item.type}</td>
                    <td className="py-3 pr-4 text-muted">{item.rewards?.length ?? 0}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          confirm={confirmPresets.deleteAction(item.name)}
                          onClick={() => void remove(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
