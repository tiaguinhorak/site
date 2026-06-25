import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/csgo-api/request-cache";
import { csgoBackendFetch, listAllCsgoApiServers } from "@/lib/csgo-api/client";
import { queryCsgoServersLive } from "@/lib/csgo-api/query-live-server";
import type { CsgoGameServer, CsgoMatchSummary } from "@/lib/csgo-api/server-types";
import { formatConnectCommand } from "@/lib/servers/connect";
import { formatMapLabel } from "@/lib/servers/maps";

type ServerStatusPayload = {
  status?: string;
  processRunning?: boolean;
  rconConnected?: boolean;
};

async function resolveServerApiStatus(
  server: CsgoGameServer,
  queryOnline: boolean,
  sync: boolean,
): Promise<string> {
  if (queryOnline) {
    if (server.status === "busy") return "busy";
    if (sync && server.status !== "online") {
      try {
        const payload = await csgoBackendFetch<ServerStatusPayload>(
          `/api/servers/${server.id}/status`,
        );
        if (payload.status) return payload.status;
      } catch {
        /* fallback */
      }
    }
    return "online";
  }

  if (sync && (server.status === "online" || server.status === "busy")) {
    try {
      const payload = await csgoBackendFetch<ServerStatusPayload>(
        `/api/servers/${server.id}/status`,
      );
      if (payload.status) return payload.status;
    } catch {
      /* mantém status da listagem */
    }
  }

  return server.status;
}

async function buildOverview(syncApiStatus = false) {
  const servers = await cached("csgo:api-servers", 10_000, async () => {
    try {
      const merged = await listAllCsgoApiServers();
      return merged.map(({ apiBaseUrl: _, ...server }) => server);
    } catch {
      return [];
    }
  });

  const liveByKey = await queryCsgoServersLive(
    servers.map((server) => ({ host: server.host, port: server.port })),
  );

  const matches = await cached("csgo:admin-active-matches", 15_000, async () => {
    const byId = new Map<string, CsgoMatchSummary>();
    for (const status of ["live", "ready", "veto", "waiting_players", "finished"] as const) {
      try {
        const batch = await csgoBackendFetch<CsgoMatchSummary[]>(`/api/matches?status=${status}`);
        for (const match of batch) {
          if (status === "finished") {
            const existing = byId.get(match.id);
            if (existing && existing.status !== "finished") continue;
          }
          byId.set(match.id, match);
        }
      } catch {
        /* ignore */
      }
    }
    return [...byId.values()].filter((m) => m.status !== "finished" && m.status !== "cancelled");
  });

  const rankedSessions = await prisma.rankedMatchSession.findMany({
    where: { status: { in: ["accepting", "voting", "starting", "live"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      matchSource: true,
      selectedMap: true,
      csgoMatchId: true,
      serverHost: true,
      serverPort: true,
      createdAt: true,
      partyA: { select: { members: { select: { userId: true } } } },
      partyB: { select: { members: { select: { userId: true } } } },
    },
  });

  return {
    servers: await Promise.all(
      servers.map(async (server) => {
        const live = liveByKey.get(`${server.host}:${server.port}`);
        const queryOnline = live?.online ?? false;
        const apiStatus = await resolveServerApiStatus(server, queryOnline, syncApiStatus);

        return {
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          apiStatus,
          queryOnline,
          reachable: queryOnline,
          map: queryOnline ? live!.map : formatMapLabel(live?.mapRaw),
          mapRaw: live?.mapRaw ?? null,
          players: live?.players ?? 0,
          slots: live?.slots ?? 0,
          ping: live?.ping ?? 0,
          connectCommand: formatConnectCommand(server.host, server.port),
        };
      }),
    ),
    matches: matches.map((match) => ({
      id: match.id,
      status: match.status,
      selectedMap: match.selectedMap ?? null,
      serverId: match.serverId ?? null,
    })),
    rankedSessions: rankedSessions.map((session) => ({
      id: session.id,
      status: session.status,
      matchSource: session.matchSource,
      selectedMap: session.selectedMap ?? null,
      csgoMatchId: session.csgoMatchId ?? null,
      serverHost: session.serverHost ?? null,
      serverPort: session.serverPort ?? null,
      playerCount:
        session.partyA.members.length + session.partyB.members.length,
      createdAt: session.createdAt.toISOString(),
    })),
  };
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const force = request.nextUrl.searchParams.get("force") === "1";
  if (force) {
    const { invalidateCache } = await import("@/lib/csgo-api/request-cache");
    invalidateCache("csgo:");
    invalidateCache("a2s:");
    return NextResponse.json(await buildOverview(true));
  }

  return NextResponse.json(await cached("csgo:admin-overview", 8_000, () => buildOverview(false)));
}
