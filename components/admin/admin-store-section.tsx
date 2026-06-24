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

type StoreItem = {
  id: string;
  name: string;
  type: string;
  priceCents: number;
  originalCents: number | null;
  badge: string;
  description: string;
  accent: string;
  trending: boolean;
  featured: boolean;
  sortOrder: number;
};

const emptyForm: {
  name: string;
  type: string;
  priceCents: string;
  originalCents: string;
  badge: string;
  description: string;
  accent: string;
  trending: boolean;
  featured: boolean;
  sortOrder: string;
} = {
  name: "",
  type: STORE_TYPE_PRESETS[0],
  priceCents: "1990",
  originalCents: "",
  badge: STORE_BADGE_PRESETS[0],
  description: "",
  accent: DEFAULT_GRADIENT.classes,
  trending: false,
  featured: false,
  sortOrder: "0",
};

export function AdminStoreSection() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/store", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
  }

  function openEdit(item: StoreItem) {
    setEditing(item);
    setForm({
      name: item.name,
      type: item.type,
      priceCents: String(item.priceCents),
      originalCents: item.originalCents ? String(item.originalCents) : "",
      badge: item.badge,
      description: item.description,
      accent: item.accent,
      trending: item.trending,
      featured: item.featured,
      sortOrder: String(item.sortOrder),
    });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      type: form.type,
      priceCents: Number(form.priceCents),
      originalCents: form.originalCents ? Number(form.originalCents) : null,
      badge: form.badge,
      description: form.description,
      accent: form.accent,
      trending: form.trending,
      featured: form.featured,
      sortOrder: Number(form.sortOrder),
    };
    const result = editing
      ? await secureApi(`/api/admin/store/${editing.id}`, { method: "PATCH", json: payload })
      : await secureApi("/api/admin/store", { method: "POST", json: payload });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    openCreate();
    load();
  }

  async function remove(id: string) {
    const result = await secureApi(`/api/admin/store/${id}`, { method: "DELETE" });
    if (result.ok) load();
  }

  const previewGradient = findGradientByClasses(form.accent);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="rounded-card glass-strong p-6 space-y-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          {editing ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
          {editing ? "Editar item" : "Novo item"}
        </h2>

        <div
          className="rounded-xl border border-border p-4"
          style={{
            background: previewGradient
              ? `linear-gradient(135deg, ${previewGradient.from}22, ${previewGradient.to}33)`
              : undefined,
          }}
        >
          <p className="text-xs uppercase text-muted">Preview</p>
          <p className="mt-1 font-display text-lg font-bold">{form.name || "Nome do item"}</p>
          <p className="text-xs text-primary">{form.badge}</p>
        </div>

        <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <PresetSelect
          label="Tipo"
          value={form.type}
          onChange={(type) => setForm({ ...form, type })}
          options={STORE_TYPE_PRESETS}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Preço (centavos)" type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} />
          <Input label="Preço original" type="number" value={form.originalCents} onChange={(e) => setForm({ ...form, originalCents: e.target.value })} />
        </div>

        <PresetSelect
          label="Badge"
          value={form.badge}
          onChange={(badge) => setForm({ ...form, badge })}
          options={STORE_BADGE_PRESETS}
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Descrição</label>
          <textarea
            value={form.description}
            rows={3}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
          />
        </div>

        <GradientPicker
          value={form.accent}
          onChange={(accent) => setForm({ ...form, accent })}
        />

        <Input label="Ordem" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.trending} onChange={(e) => setForm({ ...form, trending: e.target.checked })} />
          Em alta
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Destaque
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" className="flex-1" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : "Salvar"}
          </Button>
          {editing && <Button type="button" variant="outline" onClick={openCreate}>Cancelar</Button>}
        </div>
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
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Preço</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted">{item.badge}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted">{formatPriceCents(item.priceCents)}</td>
                    <td className="py-3 pr-4 text-muted">{item.type}</td>
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
                          onClick={() => remove(item.id)}
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
