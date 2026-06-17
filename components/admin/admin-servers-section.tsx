"use client";

import { useEffect, useState } from "react";
import { Server, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { SERVER_MODE_PRESETS } from "@/lib/admin/content-presets";
import { MapPicker } from "@/components/admin/pickers/map-picker";
import { PresetSelect } from "@/components/admin/pickers/preset-select";

type ServerRow = {
  id: string;
  name: string;
  map: string;
  mode: string;
  players: number;
  slots: number;
  ping: number;
  sortOrder: number;
};

const emptyForm: {
  name: string;
  map: string;
  mode: string;
  players: string;
  slots: string;
  ping: string;
  sortOrder: string;
} = {
  name: "",
  map: "de_mirage",
  mode: SERVER_MODE_PRESETS[0],
  players: "0",
  slots: "10",
  ping: "0",
  sortOrder: "0",
};

export function AdminServersSection() {
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServerRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/servers", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setServers(data.servers);
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

  function openEdit(server: ServerRow) {
    setEditing(server);
    setForm({
      name: server.name,
      map: server.map,
      mode: server.mode,
      players: String(server.players),
      slots: String(server.slots),
      ping: String(server.ping),
      sortOrder: String(server.sortOrder),
    });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      map: form.map,
      mode: form.mode,
      players: Number(form.players),
      slots: Number(form.slots),
      ping: Number(form.ping),
      sortOrder: Number(form.sortOrder),
    };

    const result = editing
      ? await secureApi(`/api/admin/servers/${editing.id}`, {
          method: "PATCH",
          json: payload,
        })
      : await secureApi("/api/admin/servers", {
          method: "POST",
          json: payload,
        });

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  async function remove(id: string, name: string) {
    const result = await secureApi(`/api/admin/servers/${id}`, {
      method: "DELETE",
    });
    if (result.ok) load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="rounded-card glass-strong p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          {editing ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
          {editing ? "Editar servidor" : "Novo servidor"}
        </h2>
        <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <MapPicker value={form.map} onChange={(map) => setForm({ ...form, map })} />
        <PresetSelect
          label="Modo"
          value={form.mode}
          onChange={(mode) => setForm({ ...form, mode })}
          options={SERVER_MODE_PRESETS}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Players" type="number" value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} />
          <Input label="Slots" type="number" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} />
          <Input label="Ping" type="number" value={form.ping} onChange={(e) => setForm({ ...form, ping: e.target.value })} />
          <Input label="Ordem" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" className="flex-1" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={openCreate}>
              Cancelar
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-card glass-strong p-6 lg:col-span-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Server className="h-5 w-5 text-primary" />
          Servidores ({servers.length})
        </h2>
        {loading ? (
          <p className="mt-6 text-center text-muted">Carregando...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Mapa</th>
                  <th className="py-2 pr-4">Modo</th>
                  <th className="py-2 pr-4">Ocupação</th>
                  <th className="py-2 pr-4">Ping</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {servers.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4 font-medium">{s.name}</td>
                    <td className="py-3 pr-4 text-muted">{s.map}</td>
                    <td className="py-3 pr-4 text-muted">{s.mode}</td>
                    <td className="py-3 pr-4 text-muted">{s.players}/{s.slots}</td>
                    <td className="py-3 pr-4 text-muted">{s.ping}ms</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          confirm={confirmPresets.deleteAction(s.name)}
                          onClick={() => remove(s.id, s.name)}
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
