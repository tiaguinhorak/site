import "server-only";

import { csgoBackendFetch } from "@/lib/csgo-api/client";
import type { CsgoGameServer, CsgoMatchSummary } from "@/lib/csgo-api/server-types";

export type MatchConnectInfo = {
  serverHost: string | null;
  serverPort: number | null;
  selectedMap: string | null;
  matchStatus: string;
  csgoServerId: string | null;
};

export async function resolveMatchConnect(csgoMatchId: string): Promise<MatchConnectInfo> {
  const match = await csgoBackendFetch<CsgoMatchSummary>(`/api/matches/${csgoMatchId}`);

  if (!match.serverId) {
    return {
      serverHost: null,
      serverPort: null,
      selectedMap: match.selectedMap ?? null,
      matchStatus: match.status,
      csgoServerId: null,
    };
  }

  const server = await csgoBackendFetch<CsgoGameServer>(`/api/servers/${match.serverId}`);

  return {
    serverHost: server.host,
    serverPort: server.port,
    selectedMap: match.selectedMap ?? null,
    matchStatus: match.status,
    csgoServerId: match.serverId,
  };
}
