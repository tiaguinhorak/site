"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Power,
  RotateCcw,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/admin/pickers/map-picker";
import { ServerConnectActions } from "@/components/ui/server-connect-actions";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import type { LiveServerStatView } from "@/lib/hooks/use-live-server-stats";
import { useWarmupModes } from "@/lib/hooks/use-warmup-modes";
import { formatMapLabel } from "@/lib/servers/maps";
import { resolveMapId } from "@/lib/servers/map-images";
import { MapThumbnail } from "@/components/ui/map-thumbnail";
import { cn } from "@/lib/utils";

type ControlResponse = {
  ok: boolean;
  message: string;
  warning?: string;
};

type Props = {
  server: LiveServerStatView;
  onActionComplete?: () => void;
};

function pingColor(ping: number) {
  if (ping <= 13) return "text-emerald-400";
  if (ping <= 25) return "text-amber-400";
  return "text-rose-400";
}

export function LiveServerCard({
  server,
  isAdmin,
  onAdminAction,
}: {
  server: LiveServerStatView;
  isAdmin: boolean;
  onAdminAction?: () => void;
}) {
  return (
    <li className="rounded-xl border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display font-semibold text-foreground">{server.name}</p>
          <p className="text-xs text-muted">
            {server.mode} · {server.map}
          </p>
          {server.mapId && server.online && (
            <MapThumbnail mapId={server.mapId} label={server.map} size={36} className="mt-2" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-foreground">
            {server.online ? `${server.players}/${server.slots}` : "—"}
          </span>
          <span className={cn("inline-flex items-center gap-1 font-mono", pingColor(server.ping))}>
            {server.online ? `${server.ping}ms` : "—"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold",
              server.online ? "text-emerald-400" : "text-muted",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                server.online ? "animate-pulse bg-emerald-400" : "bg-zinc-500",
              )}
            />
            {server.online ? "Online" : "Offline"}
          </span>
        </div>
      </div>
      {server.online && <ServerConnectActions host={server.host} port={server.port} />}
      {isAdmin && (
        <LiveServerManagePanel server={server} onActionComplete={onAdminAction} />
      )}
    </li>
  );
}

export function LiveServerManagePanel({ server, onActionComplete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(server.name);
  const [mode, setMode] = useState(server.mode);
  const [map, setMap] = useState(
    () => (server.mapId ?? resolveMapId(server.map)) || "de_dust2",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isWarmup = server.pool === "warmup";
  const { modes: warmupModes } = useWarmupModes(false);
  const suggestedMapIds = useMemo(() => {
    if (!isWarmup) return undefined;
    const entry = warmupModes.find((m) => m.modeLabel === mode);
    return entry?.maps?.length ? entry.maps : undefined;
  }, [isWarmup, warmupModes, mode]);
  const mapLabel = formatMapLabel(map);

  async function saveMetadata() {
    setBusy(true);
    setMessage(null);
    setError(null);
    const result = await secureApi<{ ok: boolean; server?: { name: string } }>(
      `/api/admin/servers/${server.id}`,
      {
        method: "PATCH",
        json: { name: name.trim(), mode: mode.trim() },
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Servidor atualizado.");
    onActionComplete?.();
  }

  async function changeMap() {
    if (!server.csgoServerId) {
      setError("Sem ID na API CS:GO — use Infra CS:GO.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    const result = await secureApi<ControlResponse>(
      `/api/admin/csgo/servers/${server.csgoServerId}/change-map`,
      {
        method: "POST",
        json: { map },
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.data.message);
    if (result.data.warning) setError(result.data.warning);
    onActionComplete?.();
  }

  async function stopServer() {
    if (!server.csgoServerId) {
      setError("Sem ID na API CS:GO — use Infra CS:GO.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    const result = await secureApi<ControlResponse>(
      `/api/admin/csgo/servers/${server.csgoServerId}/stop`,
      { method: "POST" },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.data.message);
    onActionComplete?.();
  }

  if (!server.csgoServerId) {
    return (
      <div className="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-muted">
        Gerenciamento indisponível para este servidor.{" "}
        <Link href="/admin/infra-csgo" className="text-primary underline-offset-2 hover:underline">
          Abrir Infra CS:GO
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Admin</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
        >
          <Pencil className="h-3.5 w-3.5" />
          {expanded ? "Fechar" : "Editar"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {server.online && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            confirm={confirmPresets.csgoStopServer(server.name)}
            onClick={() => void stopServer()}
          >
            {busy ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Power className="h-4 w-4" />}
            Derrubar
          </Button>
        )}
        <ButtonLink href="/admin/infra-csgo" variant="ghost" size="sm">
          <Settings2 className="h-4 w-4" />
          Infra completa
        </ButtonLink>
      </div>

      {expanded && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)] p-3">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          {isWarmup ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Modo warmup</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {warmupModes.map((entry) => (
                  <option key={entry.id} value={entry.modeLabel}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Input label="Modo" value={mode} onChange={(e) => setMode(e.target.value)} />
          )}
          <MapPicker
            value={map}
            onChange={setMap}
            label={`Mapa alvo — ${server.name}`}
            suggestedMapIds={suggestedMapIds}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy || !name.trim()}
              onClick={() => void saveMetadata()}
            >
              {busy ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : null}
              Salvar nome/modo
            </Button>
            {server.online && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                confirm={confirmPresets.csgoChangeMap(server.name, mapLabel)}
                onClick={() => void changeMap()}
              >
                <RotateCcw className="h-4 w-4" />
                Trocar mapa
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {message && <p className="text-xs text-emerald-400">{message}</p>}
    </div>
  );
}
