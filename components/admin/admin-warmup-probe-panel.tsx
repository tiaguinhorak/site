"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Play,
  Radio,
  RefreshCw,
  XCircle,
  Globe,
  EyeOff,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServerConnectActions } from "@/components/ui/server-connect-actions";
import { secureApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type ProbeCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

type ProbeResult = {
  ok: boolean;
  host: string;
  port: number;
  connectCommand: string;
  checks: ProbeCheck[];
  live: {
    online: boolean;
    hostname: string | null;
    map: string;
    players: number;
    slots: number;
    ping: number;
  };
  siteUrl: string;
  publishedOnSite: boolean;
  publishedServerId: string | null;
};

const DEFAULT_FORM = {
  name: "Clutch Warmup",
  host: "192.168.100.5",
  port: "27015",
  rconPort: "27015",
  rconPassword: "",
};

export function AdminWarmupProbePanel() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runProbe() {
    setBusy(true);
    setError(null);

    const port = Number(form.port);
    const rconPort = Number(form.rconPort);

    if (!form.host.trim() || !Number.isFinite(port)) {
      setError("Host e porta são obrigatórios.");
      setBusy(false);
      return;
    }

    try {
      const api = await secureApi<ProbeResult>("/api/admin/csgo/probe", {
        method: "POST",
        json: {
          host: form.host.trim(),
          port,
          rconPort: Number.isFinite(rconPort) ? rconPort : port,
          rconPassword: form.rconPassword.trim() || undefined,
        },
      });

      if (!api.ok) {
        setError(api.error);
        setResult(null);
        return;
      }

      setResult(api.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao testar servidor.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(publish: boolean) {
    if (!result) return;

    setBusy(true);
    setError(null);

    try {
      const api = await secureApi<{ ok: boolean }>("/api/admin/csgo/probe", {
        method: "POST",
        json: {
          action: publish ? "publish" : "unpublish",
          name: form.name.trim() || `Warmup ${form.host}`,
          host: result.host,
          port: result.port,
          mode: "Warmup",
        },
      });

      if (!api.ok) {
        setError(api.error);
        return;
      }

      setResult((prev) =>
        prev
          ? {
              ...prev,
              publishedOnSite: publish,
              publishedServerId: publish ? prev.publishedServerId ?? "published" : null,
            }
          : null,
      );

      if (publish) {
        await runProbe();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao publicar no site.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card glass-strong p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Teste Warmup (antes do registro)</h2>
          <p className="mt-1 text-sm text-muted">
            Valida A2S, RCON, plugins e sync do site sem registrar o servidor na API ranked.
            Depois de OK, publique no dashboard para testar connect com jogadores.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void runProbe()}>
          {busy ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Testar agora
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Nome (ao publicar no site)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Input
          label="Host (LAN ou IP público)"
          value={form.host}
          onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
        />
        <Input
          label="Porta do jogo"
          value={form.port}
          onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
        />
        <Input
          label="Porta RCON"
          value={form.rconPort}
          onChange={(e) => setForm((f) => ({ ...f, rconPort: e.target.value }))}
        />
        <Input
          label="Senha RCON"
          type="password"
          value={form.rconPassword}
          onChange={(e) => setForm((f) => ({ ...f, rconPassword: e.target.value }))}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" disabled={busy} onClick={() => void runProbe()}>
          {busy ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : (
            <Radio className="h-4 w-4" />
          )}
          Executar checklist
        </Button>
        {result?.live.online && (
          <ServerConnectActions host={result.host} port={result.port} fromPath="/admin/infra-csgo" />
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              result.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-100",
            )}
          >
            <p className="font-semibold">
              {result.ok
                ? "Checklist principal OK — pode publicar no site e testar connect."
                : "Ainda há itens críticos pendentes (A2S, RCON ou gate)."}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {result.live.online
                ? `${result.live.hostname ?? result.host} · ${result.live.map} · ${result.live.players}/${result.live.slots}`
                : "Servidor offline na query A2S."}
            </p>
          </div>

          <ul className="space-y-2">
            {result.checks.map((check) => (
              <li
                key={check.id}
                className="flex gap-3 rounded-lg border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] px-3 py-2.5 text-sm"
              >
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                )}
                <div>
                  <p className="font-medium text-foreground">{check.label}</p>
                  <p className="text-xs text-muted">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {result.publishedOnSite ? (
              <>
                <span className="text-sm text-emerald-300">Visível no dashboard (teste).</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void togglePublish(false)}
                >
                  <EyeOff className="h-4 w-4" />
                  Remover do site
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !result.live.online}
                onClick={() => void togglePublish(true)}
              >
                <Globe className="h-4 w-4" />
                Publicar no dashboard (teste)
              </Button>
            )}
            <ButtonLink variant="outline" size="sm" href="/dashboard">
              <Play className="h-4 w-4" />
              Abrir dashboard
            </ButtonLink>
          </div>

          {result.siteUrl && (
            <p className="text-xs text-muted">
              Na VPS warmup:{" "}
              <code className="rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-1.5 py-0.5">
                CLUTCH_SITE_URL={result.siteUrl}
              </code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
