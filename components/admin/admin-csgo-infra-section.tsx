"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Play,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Server,
  Swords,
  Trash2,
  XCircle,
  Flag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminRankedSessionsPanel } from "@/components/admin/admin-ranked-sessions-panel";
import { AdminWarmupProbePanel } from "@/components/admin/admin-warmup-probe-panel";
import { MapPicker } from "@/components/admin/pickers/map-picker";
import { ServerConnectActions } from "@/components/ui/server-connect-actions";
import { confirmPresets } from "@/lib/confirm-presets";
import { secureApi } from "@/lib/api/client";
import { formatMapLabel } from "@/lib/servers/maps";
import { cn } from "@/lib/utils";

type CsgoServerRow = {
  id: string;
  name: string;
  host: string;
  port: number;
  apiStatus: string;
  queryOnline: boolean;
  reachable: boolean;
  map: string;
  mapRaw: string | null;
  players: number;
  slots: number;
  ping: number;
  connectCommand: string | null;
};

type CsgoMatchRow = {
  id: string;
  status: string;
  selectedMap: string | null;
  serverId: string | null;
};

type RankedSessionRow = {
  id: string;
  status: string;
  matchSource: string;
  selectedMap: string | null;
  csgoMatchId: string | null;
  serverHost: string | null;
  serverPort: number | null;
  playerCount: number;
  createdAt: string;
};

type ControlResponse = {
  ok: boolean;
  message: string;
  warning?: string;
  orphanProcess?: boolean;
};

type BackendStatus = {
  configured: number;
  anyReachable: boolean;
  errors: { baseUrl: string; message: string }[];
};

type ApiDiagnostic = {
  baseUrl: string;
  healthOk: boolean;
  authOk: boolean;
  serverCount: number | null;
  latencyMs: number | null;
  error: string | null;
};

type RankedSimulateResponse = {
  ok: boolean;
  message: string;
  steps: string[];
  connectAddress?: string | null;
  connectCommand?: string | null;
  warning?: string;
  session?: { id: string; status: string; selectedMap?: string | null };
};

const DEFAULT_REGISTER = {
  name: "Ranked #2",
  host: "188.220.168.233",
  port: "27016",
  rconPort: "27016",
  rconPassword: "",
  csgoDir: "/home/csgo/server",
  tickrate: "128",
  map: "de_dust2",
  pool: "ranked" as "ranked" | "warmup" | "public",
};

export function AdminCsgoInfraSection() {
  const [servers, setServers] = useState<CsgoServerRow[]>([]);
  const [backend, setBackend] = useState<BackendStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<ApiDiagnostic[] | null>(null);
  const [matches, setMatches] = useState<CsgoMatchRow[]>([]);
  const [rankedSessions, setRankedSessions] = useState<RankedSessionRow[]>([]);
  const [serverMaps, setServerMaps] = useState<Record<string, string>>({});
  const [registerForm, setRegisterForm] = useState(DEFAULT_REGISTER);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulateSteps, setSimulateSteps] = useState<string[] | null>(null);
  const [simulateConnect, setSimulateConnect] = useState<{
    host: string;
    port: number;
    command: string;
  } | null>(null);
  const [lobby2x2Url, setLobby2x2Url] = useState<string | null>(null);
  const inflightRef = useRef<AbortController | null>(null);

  const load = useCallback(async (force = false) => {
    inflightRef.current?.abort();
    const controller = new AbortController();
    inflightRef.current = controller;

    const url = force ? "/api/admin/csgo/overview?force=1" : "/api/admin/csgo/overview";

    try {
      const res = await fetch(url, {
        credentials: "same-origin",
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Não foi possível carregar a infra CS:GO.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as {
        servers: CsgoServerRow[];
        matches: CsgoMatchRow[];
        rankedSessions: RankedSessionRow[];
        backend?: BackendStatus;
      };
      if (controller.signal.aborted) return;

      setServers(data.servers);
      setBackend(data.backend ?? null);
      setMatches(data.matches);
      setRankedSessions(data.rankedSessions ?? []);
      setServerMaps((prev) => {
        const next: Record<string, string> = {};
        for (const server of data.servers) {
          next[server.id] = prev[server.id] ?? server.mapRaw ?? "de_dust2";
        }
        return next;
      });
      setError(null);
      setLoading(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Não foi possível carregar a infra CS:GO.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      inflightRef.current?.abort();
      inflightRef.current = null;
    };
  }, [load]);

  function clearFeedback() {
    setMessage(null);
    setWarning(null);
    setError(null);
  }

  function applyControlResult(result: ControlResponse) {
    setMessage(result.message);
    setWarning(result.warning ?? null);
  }

  function getServerMap(server: CsgoServerRow) {
    return serverMaps[server.id] ?? server.mapRaw ?? "de_dust2";
  }

  async function runControl<T extends ControlResponse>(
    busyKey: string,
    request: () => Promise<
      | { ok: true; data: T }
      | { ok: false; error: string; warning?: string; orphanProcess?: boolean }
    >,
  ): Promise<boolean> {
    setBusyId(busyKey);
    clearFeedback();
    const result = await request();
    setBusyId(null);

    if (!result.ok) {
      setError(result.error);
      if (result.warning) setWarning(result.warning);
      if (result.orphanProcess) await load(true);
      return false;
    }

    if (!result.data.ok) {
      setError(result.data.message);
      setWarning(result.data.warning ?? null);
      return false;
    }

    applyControlResult(result.data);
    await load(true);
    return true;
  }

  async function startServer(server: CsgoServerRow) {
    const map = getServerMap(server);
    await runControl(`${server.id}:start`, () =>
      secureApi<ControlResponse>(`/api/admin/csgo/servers/${server.id}/start`, {
        method: "POST",
        json: { map },
      }),
    );
  }

  async function changeMap(server: CsgoServerRow) {
    const map = getServerMap(server);
    await runControl(`${server.id}:change-map`, () =>
      secureApi<ControlResponse>(`/api/admin/csgo/servers/${server.id}/change-map`, {
        method: "POST",
        json: { map },
      }),
    );
  }

  async function stopServer(server: CsgoServerRow) {
    await runControl(`${server.id}:stop`, () =>
      secureApi<ControlResponse>(`/api/admin/csgo/servers/${server.id}/stop`, {
        method: "POST",
      }),
    );
  }

  async function deleteServer(server: CsgoServerRow) {
    await runControl(`${server.id}:delete`, () =>
      secureApi<ControlResponse>(`/api/admin/csgo/servers/${server.id}`, {
        method: "DELETE",
      }),
    );
  }

  async function registerServer(autoStart: boolean) {
    if (!registerForm.name.trim() || !registerForm.host.trim() || !registerForm.rconPassword.trim()) {
      setError("Preencha nome, host e senha RCON.");
      return;
    }

    const portNum = Number(registerForm.port);
    const rconPortNum = Number(registerForm.rconPort);
    const portClash = servers.find((s) => s.port === portNum || s.port === rconPortNum);
    if (portClash) {
      setError(
        `A porta ${portNum === portClash.port ? portNum : rconPortNum} já está em uso por "${portClash.name}".`,
      );
      return;
    }

    const ok = await runControl(autoStart ? "register-start" : "register", () =>
      secureApi<ControlResponse>("/api/admin/csgo/servers", {
        method: "POST",
        json: {
          name: registerForm.name.trim(),
          host: registerForm.host.trim(),
          port: Number(registerForm.port),
          rconPort: Number(registerForm.rconPort),
          rconPassword: registerForm.rconPassword,
          csgoDir: registerForm.csgoDir.trim(),
          tickrate: Number(registerForm.tickrate),
          pool: registerForm.pool,
          autoStart,
          map: registerForm.map.trim() || "de_dust2",
        },
      }),
    );

    if (ok) setShowRegister(false);
  }

  async function testConnection() {
    setBusyId("diagnostics");
    setDiagnostics(null);
    clearFeedback();
    try {
      const res = await fetch("/api/admin/csgo/diagnostics", { credentials: "same-origin" });
      if (!res.ok) {
        setError("Falha ao executar diagnóstico.");
        return;
      }
      const data = (await res.json()) as { apis: ApiDiagnostic[]; configured: number };
      setDiagnostics(data.apis);
      if (data.configured === 0) {
        setError("Nenhuma API CS:GO configurada (defina CSGO_API_URL no .env do site).");
      }
    } catch {
      setError("Falha ao executar diagnóstico.");
    } finally {
      setBusyId(null);
    }
  }

  async function bootstrapServerFromEnv() {
    await runControl("bootstrap", () =>
      secureApi<ControlResponse>("/api/admin/csgo/servers/bootstrap", {
        method: "POST",
      }),
    );
  }

  async function cancelMatch(match: CsgoMatchRow) {
    await runControl(`match:cancel:${match.id}`, () =>
      secureApi<ControlResponse>(`/api/admin/csgo/matches/${match.id}/cancel`, {
        method: "POST",
      }),
    );
  }

  async function endMatch(match: CsgoMatchRow) {
    await runControl(`match:end:${match.id}`, () =>
      secureApi<ControlResponse>(`/api/admin/csgo/matches/${match.id}/end`, {
        method: "POST",
      }),
    );
  }

  async function create2x2LobbyRoom() {
    setLobby2x2Url(null);
    setBusyId("lobby:2x2");
    setError(null);
    setMessage(null);

    try {
      const api = await secureApi<{
        ok: boolean;
        message: string;
        lobbyUrl?: string;
        error?: string;
      }>("/api/admin/lobby/create-2x2", {
        method: "POST",
        json: {},
      });
      if (!api.ok) {
        setError(api.error);
        return;
      }
      setMessage(api.data.message);
      if (api.data.lobbyUrl) setLobby2x2Url(api.data.lobbyUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar sala 2x2.");
    } finally {
      setBusyId(null);
    }
  }

  async function cleanupRankedStale() {
    setBusyId("ranked:cleanup");
    setError(null);
    setMessage(null);

    try {
      const api = await secureApi<{ ok: boolean; message: string; cleared: number }>(
        "/api/admin/ranked/cleanup",
        { method: "POST", json: {} },
      );
      if (!api.ok) {
        setError(api.error);
        return;
      }
      setMessage(api.data.message);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na limpeza ranked.");
    } finally {
      setBusyId(null);
    }
  }

  async function simulateRankedMatch() {
    setSimulateSteps(null);
    setSimulateConnect(null);
    setBusyId("ranked:simulate");
    setError(null);
    setMessage(null);
    setWarning(null);

    try {
      const api = await secureApi<RankedSimulateResponse>("/api/admin/ranked/simulate", {
        method: "POST",
      });
      if (!api.ok) {
        setError(api.error);
        return;
      }

      const result = api.data;
      setSimulateSteps(result.steps);
      if (result.connectCommand && result.connectAddress) {
        const [host, portStr] = result.connectAddress.split(":");
        setSimulateConnect({
          host: host ?? "",
          port: Number(portStr) || 27015,
          command: result.connectCommand,
        });
      } else {
        setSimulateConnect(null);
      }
      if (result.ok) {
        setMessage(result.message);
        if (result.warning) setWarning(result.warning);
      } else {
        setError(result.message);
        if (result.warning) setWarning(result.warning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na simulação ranked.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 className="h-4 w-4 motion-safe-spin" />
        Carregando infra CS:GO…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminWarmupProbePanel />

      <AdminRankedSessionsPanel
        sessions={rankedSessions}
        busyId={busyId}
        onBusyChange={setBusyId}
        onRefresh={() => void load(true)}
        onMessage={(text) => {
          setMessage(text);
          setError(null);
        }}
        onError={(text) => {
          setError(text);
          setMessage(null);
        }}
      />

      <div className="rounded-card glass-strong p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Controle de servidores</h2>
            <p className="mt-1 text-sm text-muted">
              Registrar na API e subir o srcds na VPS (cada porta = uma instância screen). Abrir firewall
              sozinho não inicia o jogo — use <strong>Registrar e subir</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busyId != null}
              onClick={() => void load(true)}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyId != null}
              onClick={() => void testConnection()}
            >
              {busyId === "diagnostics" ? (
                <Loader2 className="h-4 w-4 motion-safe-spin" />
              ) : (
                <Server className="h-4 w-4" />
              )}
              Testar conexão
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowRegister((v) => !v)}>
              <Plus className="h-4 w-4" />
              Registrar servidor
            </Button>
            {servers.length === 0 && (
              <Button
                variant="primary"
                size="sm"
                disabled={busyId != null}
                onClick={() => void bootstrapServerFromEnv()}
              >
                {busyId === "bootstrap" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <Server className="h-4 w-4" />
                )}
                Auto (.env)
              </Button>
            )}
          </div>
        </div>

        {showRegister && (
          <div className="mb-6 rounded-xl border border-border p-4">
            <h3 className="mb-3 font-display font-semibold">Novo registro na API CS:GO</h3>
            <p className="mb-3 text-xs text-muted">
              Portas sugeridas: 27015 (principal), 27016, 27017… Mesmo diretório CS (
              <code className="text-xs">/home/csgo/server</code>
              ), screen e RCON diferentes por instância. Segunda instância pode precisar de outro GSLT
              no Steam.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { label: "27016 ranked", port: "27016", name: "Ranked #2" },
                { label: "27017 ranked", port: "27017", name: "Ranked #3" },
                { label: "27018 warmup", port: "27018", name: "Warmup #1", pool: "warmup" as const },
              ].map((preset) => (
                <Button
                  key={preset.port}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRegisterForm((f) => ({
                      ...f,
                      name: preset.name,
                      port: preset.port,
                      rconPort: preset.port,
                      pool: preset.pool ?? "ranked",
                    }))
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Nome"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Host"
                value={registerForm.host}
                onChange={(e) => setRegisterForm((f) => ({ ...f, host: e.target.value }))}
              />
              <Input
                label="Porta do jogo"
                value={registerForm.port}
                onChange={(e) => setRegisterForm((f) => ({ ...f, port: e.target.value }))}
              />
              <Input
                label="Porta RCON"
                value={registerForm.rconPort}
                onChange={(e) => setRegisterForm((f) => ({ ...f, rconPort: e.target.value }))}
              />
              <Input
                label="Senha RCON"
                type="password"
                value={registerForm.rconPassword}
                onChange={(e) => setRegisterForm((f) => ({ ...f, rconPassword: e.target.value }))}
              />
              <Input
                label="Diretório CS:GO"
                value={registerForm.csgoDir}
                onChange={(e) => setRegisterForm((f) => ({ ...f, csgoDir: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <MapPicker
                  label="Mapa inicial (ao subir)"
                  value={registerForm.map}
                  onChange={(map) => setRegisterForm((f) => ({ ...f, map }))}
                  allowCustom={false}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Pool</label>
                <select
                  value={registerForm.pool}
                  onChange={(e) =>
                    setRegisterForm((f) => ({
                      ...f,
                      pool: e.target.value as "ranked" | "warmup" | "public",
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="ranked">Ranked (5v5 — fila)</option>
                  <option value="warmup">Warmup (público casual)</option>
                  <option value="public">Público (legado)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={busyId != null}
                confirm={confirmPresets.csgoRegisterServer(
                  `${registerForm.name || "servidor"} (porta ${registerForm.port})`,
                )}
                onClick={() => void registerServer(true)}
              >
                {busyId === "register-start" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Registrar e subir
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busyId != null}
                onClick={() => void registerServer(false)}
              >
                {busyId === "register" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Só registrar
              </Button>
            </div>
          </div>
        )}

        {backend && (backend.configured === 0 || !backend.anyReachable) && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <p className="font-semibold">
              {backend.configured === 0
                ? "Nenhuma API CS:GO configurada"
                : "API CS:GO inacessível"}
            </p>
            <p className="mt-1 text-rose-200/90">
              {backend.configured === 0
                ? "Defina CSGO_API_URL no .env do site (ex.: http://188.220.168.233:3001) e reinicie."
                : "O site não conseguiu falar com o api-csgo da VPS. Botões de subir/derrubar/trocar não vão funcionar até isto normalizar."}
            </p>
            {backend.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-200/80">
                {backend.errors.map((e, i) => (
                  <li key={i}>
                    <span className="font-mono">{e.baseUrl}</span>: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {diagnostics && (
          <div className="mb-4 rounded-lg border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] px-4 py-3 text-sm">
            <p className="mb-2 font-display font-semibold">Diagnóstico de conexão</p>
            {diagnostics.length === 0 ? (
              <p className="text-muted">Nenhuma API CS:GO configurada no .env do site.</p>
            ) : (
              <ul className="space-y-1.5">
                {diagnostics.map((api, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        api.authOk ? "bg-emerald-400" : "bg-rose-400",
                      )}
                    />
                    <span className="font-mono">{api.baseUrl}</span>
                    <span className="text-muted">
                      {api.authOk
                        ? `OK · ${api.serverCount ?? 0} servidor(es) · ${api.latencyMs}ms`
                        : api.healthOk
                          ? `online mas ${api.error ?? "auth falhou"}`
                          : `inacessível: ${api.error ?? "sem resposta"}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}
        {warning && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 whitespace-pre-wrap">
            {warning}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {message}
          </p>
        )}

        {servers.length === 0 && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-semibold">Servidor CS:GO não registrado na API</p>
            <p className="mt-1 text-amber-200/90">
              A ranked trava em &quot;Partida em andamento&quot; sem connect até existir um servidor na
              API. Opções:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-amber-200/90">
              <li>
                Adicione no <code className="text-xs">.env</code>:{" "}
                <code className="text-xs">CSGO_SERVER_HOST=188.220.168.233</code>,{" "}
                <code className="text-xs">CSGO_RCON_PASSWORD=sua_senha</code> — reinicie o site e
                clique em <strong>Auto (.env)</strong>.
              </li>
              <li>Ou use <strong>Registrar servidor</strong> com host, porta e senha RCON da VPS.</li>
              <li>Depois suba o servidor (botão Iniciar) antes de simular a ranked.</li>
            </ol>
          </div>
        )}

        <ul className="space-y-4">
          {servers.length === 0 ? (
            <li className="text-sm text-muted">
              Nenhum servidor na API. Use Auto (.env), Registrar servidor, ou configure o .env.
            </li>
          ) : (
            servers.map((server) => {
              const online = server.reachable;
              const selectedMap = getServerMap(server);
              const mapLabel = formatMapLabel(selectedMap);
              const busy = busyId?.startsWith(`${server.id}:`) ?? false;

              return (
                <li
                  key={server.id}
                  className="rounded-xl border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-display font-semibold text-foreground">
                        <Server className="h-4 w-4 shrink-0 text-primary" />
                        {server.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted">
                        {server.host}:{server.port}
                        {" · "}
                        {server.apiStatus === "busy"
                          ? "em partida"
                          : server.apiStatus === "online" || online
                            ? "online"
                            : "offline"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 font-semibold",
                            online ? "text-emerald-400" : "text-zinc-400",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              online ? "bg-emerald-400 animate-pulse" : "bg-zinc-500",
                            )}
                          />
                          {online ? "Online" : "Offline"}
                        </span>
                        {online && (
                          <>
                            <span>Mapa atual: {server.map}</span>
                            <span>
                              {server.players}/{server.slots} jogadores
                            </span>
                            <span>{server.ping}ms</span>
                          </>
                        )}
                      </div>

                      <div className="mt-4 max-w-xl">
                        <MapPicker
                          value={selectedMap}
                          onChange={(map) =>
                            setServerMaps((prev) => ({ ...prev, [server.id]: map }))
                          }
                          label={`Mapa alvo — ${server.name}`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      {!online ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busyId != null}
                          confirm={confirmPresets.csgoStartServer(server.name, mapLabel)}
                          onClick={() => void startServer(server)}
                        >
                          {busyId === `${server.id}:start` ? (
                            <Loader2 className="h-4 w-4 motion-safe-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Subir
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busyId != null}
                            confirm={confirmPresets.csgoChangeMap(server.name, mapLabel)}
                            onClick={() => void changeMap(server)}
                          >
                            {busyId === `${server.id}:change-map` ? (
                              <Loader2 className="h-4 w-4 motion-safe-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Trocar mapa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId != null}
                            confirm={confirmPresets.csgoStopServer(server.name)}
                            onClick={() => void stopServer(server)}
                          >
                            {busyId === `${server.id}:stop` ? (
                              <Loader2 className="h-4 w-4 motion-safe-spin" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                            Derrubar
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-400 hover:text-rose-300"
                        disabled={busyId != null}
                        confirm={confirmPresets.csgoDeleteServer(server.name)}
                        onClick={() => void deleteServer(server)}
                      >
                        {busyId === `${server.id}:delete` ? (
                          <Loader2 className="h-4 w-4 motion-safe-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Remover registro
                      </Button>
                    </div>
                  </div>

                  {online && (
                    <div className="mt-4 border-t border-border pt-4">
                      <ServerConnectActions host={server.host} port={server.port} />
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="rounded-card glass-strong p-6">
        <div className="mb-4 flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Partidas API CS:GO</h2>
        </div>
        <p className="mb-4 text-sm text-muted">
          Registros na API externa. Se a ranked de teste não aparece aqui, use &quot;Sessões ranked
          (site)&quot; acima.
        </p>

        <ul className="space-y-3">
          {matches.length === 0 ? (
            <li className="text-sm text-muted">Nenhuma partida ativa na API.</li>
          ) : (
            matches.map((match) => (
              <li
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted">{match.id}</p>
                  <p className="text-sm text-foreground">
                    {match.status}
                    {match.selectedMap ? ` · ${formatMapLabel(match.selectedMap)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId != null}
                    confirm={confirmPresets.csgoCancelMatch(match.id)}
                    onClick={() => void cancelMatch(match)}
                  >
                    {busyId === `match:cancel:${match.id}` ? (
                      <Loader2 className="h-4 w-4 motion-safe-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Cancelar
                  </Button>
                  {match.status === "live" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId != null}
                      confirm={confirmPresets.csgoEndMatch(match.id)}
                      onClick={() => void endMatch(match)}
                    >
                      {busyId === `match:end:${match.id}` ? (
                        <Loader2 className="h-4 w-4 motion-safe-spin" />
                      ) : (
                        <Flag className="h-4 w-4" />
                      )}
                      Encerrar
                    </Button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-card glass-strong p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <h2 className="font-display text-lg font-bold">Sala 2x2 (lobby + partida)</h2>
              <p className="mt-1 text-sm text-muted">
                Cria sala Wingman 2x2 visível no lobby. Você e seu amigo entram, o host inicia a
                partida (bots preenchem vagas vazias), todos veem o modal de votação de mapa com
                timer e depois o connect.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={busyId != null}
            onClick={() => void create2x2LobbyRoom()}
          >
            {busyId === "lobby:2x2" ? (
              <Loader2 className="h-4 w-4 motion-safe-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar sala 2x2
          </Button>
        </div>
        {lobby2x2Url && (
          <p className="text-sm text-muted">
            Abra no lobby:{" "}
            <Link href={lobby2x2Url} className="text-primary underline-offset-2 hover:underline">
              {lobby2x2Url}
            </Link>
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted">
            Partidas ou salas presas (estado ranked/lobby travado)? Limpa sessões expiradas e
            libera salas em <code className="text-xs">in_match</code> sem partida ativa.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busyId != null}
            onClick={() => void cleanupRankedStale()}
          >
            {busyId === "ranked:cleanup" ? (
              <Loader2 className="h-4 w-4 motion-safe-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Limpar ranked travado
          </Button>
        </div>
      </div>

      <div className="rounded-card glass-strong p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-display text-lg font-bold">Teste ranked (E2E)</h2>
              <p className="mt-1 text-sm text-muted">
                Simula lobby 5v5, desafio, aceite 10/10 e votação de mapas sem precisar de 10
                contas Steam. Você entra na party A — abra{" "}
                <Link href="/dashboard/ranked" className="text-primary underline-offset-2 hover:underline">
                  /dashboard/ranked
                </Link>{" "}
                para ver a UI ao vivo.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={busyId != null}
            confirm={confirmPresets.rankedSimulateMatch}
            onClick={() => void simulateRankedMatch()}
          >
            {busyId === "ranked:simulate" ? (
              <Loader2 className="h-4 w-4 motion-safe-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Simular partida ranked
          </Button>
        </div>

        {simulateSteps && simulateSteps.length > 0 && (
          <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
            {simulateSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}

        {simulateConnect && (
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted">Connect após simulação</p>
            <p className="font-mono text-sm text-foreground">{simulateConnect.command}</p>
            <div className="mt-2">
              <ServerConnectActions host={simulateConnect.host} port={simulateConnect.port} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
