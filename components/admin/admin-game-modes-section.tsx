"use client";

import { useEffect, useState } from "react";
import {
  Gamepad2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
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

type Room = {
  id: string;
  name: string;
  map: string;
  players: number;
  slots: number;
  ping: number;
  sortOrder: number;
};

type GameMode = {
  id: string;
  slug: string;
  name: string;
  accent: string;
  tagline: string;
  description: string;
  iconKey: string;
  sortOrder: number;
  rooms: Room[];
};

const emptyModeForm = {
  slug: "",
  name: "",
  accent: DEFAULT_GRADIENT.classes,
  tagline: "",
  description: "",
  iconKey: "Crosshair",
  sortOrder: "0",
};

const emptyRoomForm = {
  name: "",
  map: "de_mirage",
  players: "0",
  slots: "10",
  ping: "0",
  sortOrder: "0",
};

export function AdminGameModesSection() {
  const [modes, setModes] = useState<GameMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingMode, setEditingMode] = useState<GameMode | null>(null);
  const [modeForm, setModeForm] = useState(emptyModeForm);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/game-modes", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setModes(data.modes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreateMode() {
    setEditingMode(null);
    setModeForm(emptyModeForm);
    setError(null);
  }

  function openEditMode(mode: GameMode) {
    setEditingMode(mode);
    setModeForm({
      slug: mode.slug,
      name: mode.name,
      accent: mode.accent,
      tagline: mode.tagline,
      description: mode.description,
      iconKey: mode.iconKey,
      sortOrder: String(mode.sortOrder),
    });
    setError(null);
  }

  async function saveMode() {
    setSaving(true);
    setError(null);
    const payload = {
      ...modeForm,
      sortOrder: Number(modeForm.sortOrder),
    };
    const result = editingMode
      ? await secureApi(`/api/admin/game-modes/${editingMode.id}`, { method: "PATCH", json: payload })
      : await secureApi("/api/admin/game-modes", { method: "POST", json: payload });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    openCreateMode();
    load();
  }

  async function deleteMode(id: string, name: string) {
    const result = await secureApi(`/api/admin/game-modes/${id}`, { method: "DELETE" });
    if (result.ok) load();
  }

  function openCreateRoom(modeId: string) {
    setExpandedId(modeId);
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
  }

  function openEditRoom(room: Room, modeId: string) {
    setExpandedId(modeId);
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      map: room.map,
      players: String(room.players),
      slots: String(room.slots),
      ping: String(room.ping),
      sortOrder: String(room.sortOrder),
    });
  }

  async function saveRoom(modeId: string) {
    setSaving(true);
    const payload = {
      name: roomForm.name,
      map: roomForm.map,
      players: Number(roomForm.players),
      slots: Number(roomForm.slots),
      ping: Number(roomForm.ping),
      sortOrder: Number(roomForm.sortOrder),
    };
    const result = editingRoom
      ? await secureApi(`/api/admin/game-mode-rooms/${editingRoom.id}`, { method: "PATCH", json: payload })
      : await secureApi(`/api/admin/game-modes/${modeId}/rooms`, { method: "POST", json: payload });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    load();
  }

  async function deleteRoom(id: string) {
    const result = await secureApi(`/api/admin/game-mode-rooms/${id}`, { method: "DELETE" });
    if (result.ok) load();
  }

  const previewGradient = findGradientByClasses(modeForm.accent);
  const PreviewIcon = resolveIcon(modeForm.iconKey);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="rounded-card glass-strong p-6 space-y-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Gamepad2 className="h-5 w-5 text-primary" />
          {editingMode ? "Editar modo" : "Novo modo"}
        </h2>

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
            <p className="font-semibold">{modeForm.name || "Nome do modo"}</p>
            <p className="text-xs text-muted">{modeForm.tagline || "Tagline"}</p>
          </div>
        </div>

        <Input label="Slug" value={modeForm.slug} onChange={(e) => setModeForm({ ...modeForm, slug: e.target.value })} />
        <Input label="Nome" value={modeForm.name} onChange={(e) => setModeForm({ ...modeForm, name: e.target.value })} />
        <Input label="Tagline" value={modeForm.tagline} onChange={(e) => setModeForm({ ...modeForm, tagline: e.target.value })} />
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Descrição</label>
          <textarea
            value={modeForm.description}
            rows={2}
            onChange={(e) => setModeForm({ ...modeForm, description: e.target.value })}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
          />
        </div>

        <IconPicker
          value={modeForm.iconKey}
          onChange={(iconKey) => setModeForm({ ...modeForm, iconKey })}
        />

        <GradientPicker
          value={modeForm.accent}
          onChange={(accent) => setModeForm({ ...modeForm, accent })}
        />

        <Input label="Ordem" type="number" value={modeForm.sortOrder} onChange={(e) => setModeForm({ ...modeForm, sortOrder: e.target.value })} />

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" className="flex-1" disabled={saving} onClick={saveMode}>
            {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : "Salvar modo"}
          </Button>
          {editingMode && <Button type="button" variant="outline" onClick={openCreateMode}>Cancelar</Button>}
        </div>
      </section>

      <section className="rounded-card glass-strong p-6 lg:col-span-2 space-y-4">
        <h2 className="font-display text-lg font-bold">Modos ({modes.length})</h2>
        {loading ? (
          <p className="text-center text-muted py-8">Carregando...</p>
        ) : (
          <ul className="space-y-3">
            {modes.map((mode) => {
              const expanded = expandedId === mode.id;
              const ModeIcon = resolveIcon(mode.iconKey);
              const grad = findGradientByClasses(mode.accent);
              return (
                <li key={mode.id} className="rounded-xl border border-border">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => setExpandedId(expanded ? null : mode.id)}
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
                      {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                      <div>
                        <p className="font-semibold">{mode.name}</p>
                        <p className="text-xs text-muted">{mode.slug} · {mode.rooms.length} salas</p>
                      </div>
                    </button>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEditMode(mode)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        confirm={confirmPresets.deleteAction(mode.name)}
                        onClick={() => deleteMode(mode.id, mode.name)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-border p-4 space-y-4 bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]">
                      <Input label="Nome da sala" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} />
                      <MapPicker value={roomForm.map} onChange={(map) => setRoomForm({ ...roomForm, map })} />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Input label="Players" type="number" value={roomForm.players} onChange={(e) => setRoomForm({ ...roomForm, players: e.target.value })} />
                        <Input label="Slots" type="number" value={roomForm.slots} onChange={(e) => setRoomForm({ ...roomForm, slots: e.target.value })} />
                        <Input label="Ping" type="number" value={roomForm.ping} onChange={(e) => setRoomForm({ ...roomForm, ping: e.target.value })} />
                        <Input label="Ordem" type="number" value={roomForm.sortOrder} onChange={(e) => setRoomForm({ ...roomForm, sortOrder: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" disabled={saving} onClick={() => saveRoom(mode.id)}>
                          {editingRoom ? "Atualizar sala" : "Adicionar sala"}
                        </Button>
                        {editingRoom && (
                          <Button type="button" size="sm" variant="outline" onClick={() => { setEditingRoom(null); setRoomForm(emptyRoomForm); }}>
                            Cancelar
                          </Button>
                        )}
                        {!editingRoom && (
                          <Button type="button" size="sm" variant="outline" onClick={() => openCreateRoom(mode.id)}>
                            <Plus className="h-4 w-4" />
                            Nova sala
                          </Button>
                        )}
                      </div>
                      <ul className="space-y-2">
                        {mode.rooms.map((room) => (
                          <li key={room.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                            <span>
                              <strong>{room.name}</strong>
                              <span className="text-muted"> · {room.map} · {room.players}/{room.slots}</span>
                            </span>
                            <div className="flex gap-1">
                              <Button type="button" variant="ghost" size="sm" onClick={() => openEditRoom(room, mode.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                confirm={confirmPresets.deleteAction(room.name)}
                                onClick={() => deleteRoom(room.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
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
