import "server-only";

import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";
import { getAllEquippedLoadoutsForSync } from "@/lib/csgo-api/services/skins";
import { refreshCsgoServerLive } from "@/lib/csgo-api/query-live-server";
import { tryRconCommand } from "@/lib/csgo-api/rcon";
import { formatConnectCommand } from "@/lib/servers/connect";
import { csgoBackendFetch } from "@/lib/csgo-api/client";
import { readDefaultCsgoServerEnv } from "@/lib/csgo-api/config";

export type GameServerProbeCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type GameServerProbeResult = {
  ok: boolean;
  host: string;
  port: number;
  connectCommand: string;
  checks: GameServerProbeCheck[];
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

type ProbeInput = {
  host: string;
  port: number;
  rconPort: number;
  rconPassword?: string;
};

function pushCheck(
  checks: GameServerProbeCheck[],
  id: string,
  label: string,
  ok: boolean,
  detail: string,
) {
  checks.push({ id, label, ok, detail });
}

function includesAny(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

async function findPublishedManualServer(host: string, port: number) {
  return prisma.publicServer.findFirst({
    where: {
      host,
      port,
      csgoServerId: null,
      isLiveSynced: true,
    },
    select: { id: true },
  });
}

export async function probeGameServer(input: ProbeInput): Promise<GameServerProbeResult> {
  const checks: GameServerProbeCheck[] = [];
  const { host, port, rconPort, rconPassword } = input;

  const live = await refreshCsgoServerLive(host, port);
  pushCheck(
    checks,
    "a2s",
    "Query A2S (servidor responde)",
    live.online,
    live.online
      ? `${live.hostname ?? host} · ${live.map} · ${live.players}/${live.slots} · ${live.ping}ms`
      : "Sem resposta na porta — confira srcds, firewall e IP/porta.",
  );

  if (!rconPassword) {
    pushCheck(
      checks,
      "rcon",
      "RCON",
      false,
      "Preencha a senha RCON para testar controle remoto.",
    );
  } else {
    const rconResult = await tryRconCommand(
      { host, rconPort, rconPassword, gamePort: port },
      "status",
      { direct: true },
    );

    if (rconResult.ok) {
      pushCheck(
        checks,
        "rcon",
        "RCON",
        true,
        `Conexão OK via ${rconResult.connectHost}:${rconResult.connectPort} (comando status).`,
      );
    } else {
      let detail = rconResult.error;

      const envServer = readDefaultCsgoServerEnv();
      if (
        envServer &&
        envServer.host === host &&
        envServer.rconPassword === rconPassword
      ) {
        try {
          const apiServers = await csgoBackendFetch<{ id: string; host: string; port: number }[]>(
            "/api/servers",
          );
          const registered = apiServers.find((s) => s.host === host && s.port === port);
          if (registered) {
            const proxy = await csgoBackendFetch<{ result?: string }>(
              `/api/servers/${registered.id}/rcon`,
              { method: "POST", body: { command: "status" } },
            );
            pushCheck(
              checks,
              "rcon",
              "RCON (via API na VPS)",
              true,
              `Direto do PC falhou, mas a API na VPS conectou (srcds local). ${(proxy.result ?? "").split("\n")[0]?.trim()}`,
            );
          } else {
            pushCheck(checks, "rcon", "RCON", false, detail);
          }
        } catch {
          pushCheck(checks, "rcon", "RCON", false, detail);
        }
      } else {
        pushCheck(checks, "rcon", "RCON", false, detail);
      }
    }

    const rconOk = checks.some((c) => c.id === "rcon" && c.ok);

    if (rconOk) {
      const statusAttempt = await tryRconCommand(
        { host, rconPort, rconPassword, gamePort: port },
        "status",
        { direct: true },
      );

      if (statusAttempt.ok) {
        try {
          const smVersion = await tryRconCommand(
            { host, rconPort, rconPassword, gamePort: port },
            "sm version",
            { direct: true },
          );
          const smText = smVersion.ok ? smVersion.output : "";
          const smOk = includesAny(smText, ["sourcemod", "version"]);
          pushCheck(
            checks,
            "sourcemod",
            "SourceMod",
            smOk,
            smOk ? smText.split("\n")[0]?.trim() || "OK" : "SourceMod não respondeu.",
          );

          const pluginsAttempt = await tryRconCommand(
            { host, rconPort, rconPassword, gamePort: port },
            "sm plugins list",
            { direct: true },
          );
          const plugins = pluginsAttempt.ok ? pluginsAttempt.output : "";
          const hasGate = includesAny(plugins, ["clutch_platform_gate", "platform_gate"]);
          const hasSkins = includesAny(plugins, ["clutch_skins", "skins_bridge", "ws"]);
          pushCheck(
            checks,
            "gate",
            "Plugin gate (allowlist Steam)",
            hasGate,
            hasGate ? "clutch_platform_gate detectado." : "Não encontrado — rode install-warmup-plugins.sh.",
          );
          pushCheck(
            checks,
            "skins",
            "Plugin skins bridge",
            hasSkins,
            hasSkins ? "Bridge de skins detectado." : "Não encontrado — skins não sincronizam no jogo.",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Falha ao listar plugins";
          pushCheck(checks, "sourcemod", "SourceMod / plugins", false, msg);
        }
      }
    }
  }

  const syncKey = getSkinsSyncKey();
  pushCheck(
    checks,
    "sync_key",
    "CSGO_SKINS_SYNC_KEY no site",
    Boolean(syncKey),
    syncKey
      ? "Chave configurada — VPS pode sincronizar allowlist/loadout."
      : "Defina CSGO_SKINS_SYNC_KEY no .env do site.",
  );

  const steamUsers = await prisma.user.count({ where: { steamId: { not: null } } });
  pushCheck(
    checks,
    "allowlist",
    "Contas Steam no site (allowlist)",
    steamUsers > 0,
    steamUsers > 0
      ? `${steamUsers} conta(s) com Steam vinculada.`
      : "Nenhuma — gate vai kickar todos até vincular Steam.",
  );

  const loadouts = await getAllEquippedLoadoutsForSync();
  pushCheck(
    checks,
    "loadouts",
    "Loadouts equipados para sync",
    loadouts.length > 0,
    loadouts.length > 0
      ? `${loadouts.length} loadout(s) prontos para sync-team-loadouts-warmup.sh.`
      : "Nenhum — equipar skins no site ou ignorar se só testa connect.",
  );

  const siteUrl = getAppUrl();
  pushCheck(
    checks,
    "site_url",
    "URL pública do site (CLUTCH_SITE_URL na VPS)",
    siteUrl.length > 0,
    siteUrl
      ? `Configure na VPS: CLUTCH_SITE_URL=${siteUrl}`
      : "APP_URL não definido no .env do site.",
  );

  const published = await findPublishedManualServer(host, port);
  const criticalIds = ["a2s"];
  if (rconPassword) criticalIds.push("rcon", "gate");
  const criticalOk = checks
    .filter((c) => criticalIds.includes(c.id))
    .every((c) => c.ok);

  return {
    ok: criticalOk,
    host,
    port,
    connectCommand: formatConnectCommand(host, port) ?? `connect ${host}:${port}`,
    checks,
    live: {
      online: live.online,
      hostname: live.hostname,
      map: live.map,
      players: live.players,
      slots: live.slots,
      ping: live.ping,
    },
    siteUrl,
    publishedOnSite: Boolean(published),
    publishedServerId: published?.id ?? null,
  };
}
