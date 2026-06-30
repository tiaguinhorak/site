"use client";

import { useEffect, useState } from "react";
import {
  Flame,
  Gamepad2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { DEFAULT_GRADIENT, findGradientByClasses } from "@/lib/admin/content-presets";
import { GradientPicker } from "@/components/admin/pickers/gradient-picker";
import { IconPicker } from "@/components/admin/pickers/icon-picker";
import { MapPicker } from "@/components/admin/pickers/map-picker";
import { resolveIcon } from "@/lib/icon-map";
import { formatMapLabel } from "@/lib/servers/maps";
import { MapThumbnail } from "@/components/ui/map-thumbnail";
import type { WarmupModeDef } from "@/lib/warmup/modes";

type AdminWarmupMode = WarmupModeDef & { dbId: string; sortOrder: number };

const emptyForm = {
  slug: "",
  label: "",
  modeLabel: "",
  accent: DEFAULT_GRADIENT.classes,
  iconKey: "Crosshair",
  sortOrder: "0",
  enabled: true,
  maps: [] as string[],
};

export function AdminWarmupModesSection() {
  const [modes, setModes] = useState<AdminWarmupMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminWarmupMode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickMap, setPickMap] = useState("de_mirage");

  function load() {
    fetch("/api/admin/warmup-modes", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { modes: AdminWarmupMode[] }) => {
        setModes(
          data.modes.map((m) => ({
            ...m,
            dbId: (m as AdminWarmupMode & { dbId?: string }).dbId ?? m.id,
          })),
        );
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
  }

  function openEdit(mode: AdminWarmupMode) {
    setEditing(mode);
    setForm({
      slug: mode.slug,
      label: mode.label,
      modeLabel: mode.modeLabel,
      accent: mode.accent,
      iconKey: mode.icon,
      sortOrder: String(mode.sortOrder ?? 0),
      enabled: mode.enabled !== false,
      maps: mode.maps ?? [],
    });
    setError(null);
  }

  function addMapToForm(mapId: string) {
    if (!mapId.trim()) return;
    setForm((f) =>
      f.maps.includes(mapId) ? f : { ...f, maps: [...f.maps, mapId.trim()] },
    );
  }

  function removeMapFromForm(mapId: string) {
    setForm((f) => ({ ...f, maps: f.maps.filter((m) => m !== mapId) }));
  }

  async function saveMode() {
    setSaving(true);
    setError(null);
    const payload = {
      slug: form.slug,
      label: form.label,
      modeLabel: form.modeLabel,
      accent: form.accent,
      iconKey: form.iconKey,
      sortOrder: Number(form.sortOrder),
      enabled: form.enabled,
      maps: form.maps,
    };

    const result = editing
      ? await secureApi(`/api/admin/warmup-modes/${editing.dbId}`, {
          method: "PATCH",
          json: payload,
        })
      : await secureApi("/api/admin/warmup-modes", { method: "POST", json: payload });

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    openCreate();
    load();
  }

  async function deleteMode(mode: AdminWarmupMode) {
    const result = await secureApi(`/api/admin/warmup-modes/${mode.dbId}`, {
      method: "DELETE",
    });
    if (result.ok) load();
  }

  const previewGradient = findGradientByClasses(form.accent);
  const PreviewIcon = resolveIcon(form.iconKey);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="space-y-5 rounded-card glass-strong p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Flame className="h-5 w-5 text-amber-400" />
          {editing ? "Editar modo warmup" : "Novo modo warmup"}
        </h2>
        <p className="text-xs text-muted">
          Estes modos aparecem em <strong>/dashboard/warmup</strong> (filtros e servidores).
          O campo <strong>rótulo do servidor</strong> deve bater com{" "}
          <code className="text-xs">PublicServer.mode</code> nos servidores ao vivo.
        </p>

        <div className="flex items-center gap-4 rounded-xl border border-border p-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
            style={{
              background: previewGradient
                ? `linear-gradient(135deg, ${previewGradient.from}, ${previewGradient.to})`
                : undefined,
            }}
          >
            <PreviewIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">{form.label || "Nome"}</p>
            <p className="text-xs text-muted">{form.modeLabel || "Rótulo servidor"}</p>
          </div>
        </div>

        <Input
          label="Slug (id interno)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <Input
          label="Nome exibido"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <Input
          label="Rótulo do servidor (PublicServer.mode)"
          value={form.modeLabel}
          onChange={(e) => setForm({ ...form, modeLabel: e.target.value })}
        />

        <IconPicker value={form.iconKey} onChange={(iconKey) => setForm({ ...form, iconKey })} />
        <GradientPicker value={form.accent} onChange={(accent) => setForm({ ...form, accent })} />
        <Input
          label="Ordem"
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Ativo no hub warmup
        </label>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Mapas sugeridos
          </p>
          <MapPicker
            label="Adicionar mapa"
            value={pickMap}
            onChange={setPickMap}
            allowCustom
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => addMapToForm(pickMap)}
          >
            <Plus className="h-4 w-4" />
            Incluir mapa
          </Button>
          {form.maps.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {form.maps.map((mapId) => (
                <li
                  key={mapId}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs"
                >
                  <MapThumbnail mapId={mapId} label={formatMapLabel(mapId)} size={22} rounded="md" />
                  {formatMapLabel(mapId)}
                  <button
                    type="button"
                    className="text-rose-400"
                    onClick={() => removeMapFromForm(mapId)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" className="flex-1" disabled={saving} onClick={() => void saveMode()}>
            {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : "Salvar"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={openCreate}>
              Cancelar
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-card glass-strong p-6 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">
            <Gamepad2 className="mr-2 inline h-5 w-5 text-primary" />
            Modos warmup ({modes.length})
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
        <p className="text-xs text-muted">
          Diferente de <a href="/admin/modos" className="text-primary underline">Modos (lobby)</a> —
          aqui você controla Deathmatch, Surf, Retake, Warmup, etc.
        </p>

        {loading ? (
          <p className="py-8 text-center text-muted">Carregando...</p>
        ) : (
          <ul className="space-y-3">
            {modes.map((mode) => {
              const expanded = expandedId === mode.dbId;
              const ModeIcon = resolveIcon(mode.icon);
              const grad = findGradientByClasses(mode.accent);
              return (
                <li
                  key={mode.dbId}
                  className={`rounded-xl border ${mode.enabled === false ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3 p-4">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => setExpandedId(expanded ? null : mode.dbId)}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{
                          background: grad
                            ? `linear-gradient(135deg, ${grad.from}, ${grad.to})`
                            : undefined,
                        }}
                      >
                        <ModeIcon className="h-5 w-5" />
                      </div>
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold">{mode.label}</p>
                        <p className="text-xs text-muted">
                          {mode.slug} · servidor: {mode.modeLabel} · {(mode.maps ?? []).length}{" "}
                          mapas
                        </p>
                      </div>
                    </button>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(mode)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        confirm={confirmPresets.deleteAction(mode.label)}
                        onClick={() => void deleteMode(mode)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t border-border px-4 py-3 text-sm text-muted">
                      {(mode.maps ?? []).length === 0 ? (
                        <p>Nenhum mapa sugerido — adicione na edição.</p>
                      ) : (
                        <p>
                          Mapas:{" "}
                          {(mode.maps ?? []).map((m) => formatMapLabel(m)).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
