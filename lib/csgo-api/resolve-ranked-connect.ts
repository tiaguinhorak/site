import "server-only";

import { csgoBackendFetch } from "@/lib/csgo-api/client";
import { resolveMatchConnect, type MatchConnectInfo } from "@/lib/csgo-api/match-connect";
import { queryCsgoServerLive } from "@/lib/csgo-api/query-live-server";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";

export async function resolveRankedConnect(
  csgoMatchId?: string | null,
): Promise<MatchConnectInfo> {
  if (csgoMatchId) {
    try {
      const fromMatch = await resolveMatchConnect(csgoMatchId);
      if (fromMatch.serverHost && fromMatch.serverPort) return fromMatch;
    } catch {
      /* fallback abaixo */
    }
  }

  let servers: CsgoGameServer[] = [];
  try {
    servers = await csgoBackendFetch<CsgoGameServer[]>("/api/servers");
  } catch {
    return {
      serverHost: null,
      serverPort: null,
      selectedMap: null,
      matchStatus: "offline",
    };
  }

  const server = servers[0];
  if (!server) {
    return {
      serverHost: null,
      serverPort: null,
      selectedMap: null,
      matchStatus: "offline",
    };
  }

  const live = await queryCsgoServerLive(server.host, server.port);
  if (!live.online && server.status !== "online") {
    return {
      serverHost: null,
      serverPort: null,
      selectedMap: live.mapRaw ?? null,
      matchStatus: "offline",
    };
  }

  const online = live.online || server.status === "online";

  return {
    serverHost: server.host,
    serverPort: server.port,
    selectedMap: live.mapRaw ?? null,
    matchStatus: online ? "live" : server.status,
  };
}
