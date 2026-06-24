import "server-only";

import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/csgo-api/request-cache";
import { queryCsgoServersLive } from "@/lib/csgo-api/query-live-server";
import { syncCsgoPublicServers } from "@/lib/csgo-api/sync-public-servers";
import type { LiveServerQueryResult } from "@/lib/csgo-api/query-live-server";
import { formatConnectCommand } from "@/lib/servers/connect";

export type LiveServerPool = "ranked" | "warmup" | "public";

export type LiveServerStatPayload = {
  id: string;
  name: string;
  map: string;
  mode: string;
  host: string;
  port: number;
  players: number;
  slots: number;
  ping: number;
  online: boolean;
  connectCommand: string;
  csgoServerId: string | null;
  pool: LiveServerPool;
};

type FetchLiveServerStatsOptions = {
  forceSync?: boolean;
  pool?: "ranked" | "warmup";
};

function toPayload(
  row: {
    id: string;
    name: string;
    mode: string;
    host: string;
    port: number;
    csgoServerId: string | null;
    pool: string;
  },
  live: LiveServerQueryResult,
): LiveServerStatPayload {
  const pool: LiveServerPool =
    row.pool === "ranked" || row.pool === "warmup" ? row.pool : "public";

  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    host: row.host,
    port: row.port,
    map: live.online ? live.map : "Offline",
    players: live.players,
    slots: live.online ? live.slots : 0,
    ping: live.online ? live.ping : 0,
    online: live.online,
    connectCommand: formatConnectCommand(row.host, row.port) ?? "",
    csgoServerId: row.csgoServerId,
    pool,
  };
}

function offlineLive(host: string, port: number): LiveServerQueryResult {
  return {
    host,
    port,
    online: false,
    hostname: null,
    map: "Offline",
    mapRaw: null,
    players: 0,
    slots: 0,
    bots: 0,
    ping: 0,
  };
}

function poolWhere(pool?: "ranked" | "warmup") {
  const base = {
    isLiveSynced: true,
    host: { not: null } as const,
    port: { not: null } as const,
  };

  if (pool === "warmup") {
    return { ...base, pool: "warmup" };
  }

  if (pool === "ranked") {
    return { ...base, pool: { not: "warmup" } };
  }

  return base;
}

export async function fetchLiveServerStats(
  options?: FetchLiveServerStatsOptions,
): Promise<LiveServerStatPayload[]> {
  if (options?.forceSync) {
    const { syncCsgoPublicServersForce } = await import("@/lib/csgo-api/sync-public-servers");
    await syncCsgoPublicServersForce();
  } else {
    // Não bloqueia a resposta — sync pesado roda em background (~1x/45s).
    void syncCsgoPublicServers().catch(() => {});
  }

  const cacheKey = options?.pool ? `live-server-stats:${options.pool}` : "live-server-stats";

  return cached(cacheKey, 12_000, async () => {
    const rows = await prisma.publicServer.findMany({
      where: poolWhere(options?.pool),
      orderBy: { sortOrder: "asc" },
    });

    const withHost = rows.filter(
      (row): row is typeof row & { host: string; port: number } =>
        row.host != null && row.port != null,
    );

    if (withHost.length === 0) return [];

    const targets = withHost.map((row) => ({ host: row.host, port: row.port }));
    const liveByKey = await queryCsgoServersLive(targets);

    return withHost.map((row) => {
      const live = liveByKey.get(`${row.host}:${row.port}`) ?? offlineLive(row.host, row.port);
      return toPayload(row, live);
    });
  });
}
