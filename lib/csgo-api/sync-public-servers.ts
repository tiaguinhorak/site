import "server-only";

import { prisma } from "@/lib/prisma";
import { csgoBackendFetch } from "@/lib/csgo-api/client";
import { cached, throttled } from "@/lib/csgo-api/request-cache";
import { queryCsgoServersLive } from "@/lib/csgo-api/query-live-server";
import type { CsgoGameServer, CsgoMatchSummary } from "@/lib/csgo-api/server-types";

const LIVE_SYNC_SORT_BASE = -1000;
const SYNC_INTERVAL_MS = 45_000;

async function fetchLiveMatchesByServer(): Promise<Map<string, CsgoMatchSummary>> {
  return cached("csgo:live-matches-by-server", 15_000, async () => {
    const byServer = new Map<string, CsgoMatchSummary>();

    for (const status of ["live", "ready"] as const) {
      try {
        const matches = await csgoBackendFetch<CsgoMatchSummary[]>(
          `/api/matches?status=${status}`,
        );
        for (const match of matches) {
          if (match.serverId) byServer.set(match.serverId, match);
        }
      } catch {
        /* ignore */
      }
    }

    return byServer;
  });
}

async function listCsgoApiServers(): Promise<CsgoGameServer[]> {
  return cached("csgo:api-servers", 10_000, async () => {
    try {
      return await csgoBackendFetch<CsgoGameServer[]>("/api/servers");
    } catch {
      return [];
    }
  });
}

async function syncCsgoPublicServersNow(): Promise<void> {
  const servers = await listCsgoApiServers();
  const liveByServer = await fetchLiveMatchesByServer();
  const liveByKey = await queryCsgoServersLive(
    servers.map((server) => ({ host: server.host, port: server.port })),
  );

  const seenIds = new Set<string>();
  const upserts: Promise<unknown>[] = [];

  for (const [index, server] of servers.entries()) {
    const live = liveByKey.get(`${server.host}:${server.port}`) ?? {
      host: server.host,
      port: server.port,
      online: false,
      hostname: null,
      map: "Offline",
      mapRaw: null,
      players: 0,
      slots: 0,
      bots: 0,
      ping: 0,
    };

    const apiOnline = server.status !== "offline";
    const reachable = live.online;

    if (!apiOnline && !reachable) {
      await prisma.publicServer.deleteMany({ where: { csgoServerId: server.id } });
      continue;
    }

    seenIds.add(server.id);
    const liveMatch = liveByServer.get(server.id);
    const pool = server.pool ?? "public";
    const existing = await prisma.publicServer.findUnique({
      where: { csgoServerId: server.id },
    });
    let mode = liveMatch ? "Competitivo" : "Público";
    if (
      pool === "warmup" &&
      existing?.mode &&
      existing.mode !== "Competitivo" &&
      existing.mode !== "Público"
    ) {
      mode = existing.mode;
    }
    const map = reachable ? (live.mapRaw ?? live.map) : "offline";

    upserts.push(
      prisma.publicServer.upsert({
        where: { csgoServerId: server.id },
        create: {
          csgoServerId: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          map,
          mode,
          players: live.players,
          slots: reachable ? live.slots : 10,
          ping: live.ping,
          sortOrder: LIVE_SYNC_SORT_BASE + index,
          isLiveSynced: true,
          pool,
        },
        update: {
          name: server.name,
          host: server.host,
          port: server.port,
          map,
          mode,
          players: live.players,
          slots: reachable ? live.slots : 10,
          ping: live.ping,
          isLiveSynced: true,
          pool,
        },
      }),
    );
  }

  await Promise.all(upserts);

  if (seenIds.size === 0 && servers.length === 0) {
    return;
  }

  if (seenIds.size === 0) {
    await prisma.publicServer.deleteMany({ where: { isLiveSynced: true } });
    return;
  }

  await prisma.publicServer.deleteMany({
    where: {
      isLiveSynced: true,
      csgoServerId: { not: null, notIn: [...seenIds] },
    },
  });
}

/** Sincroniza servidores da API CS:GO → PublicServer (no máximo ~1x/45s). */
export async function syncCsgoPublicServers(): Promise<void> {
  await throttled("csgo-public-sync", SYNC_INTERVAL_MS, syncCsgoPublicServersNow);
}

/** Força sync imediato (após ações admin). */
export async function syncCsgoPublicServersForce(): Promise<void> {
  const { invalidateCache } = await import("@/lib/csgo-api/request-cache");
  invalidateCache("csgo:");
  invalidateCache("live-server-stats");
  await syncCsgoPublicServersNow();
}
