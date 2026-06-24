import "server-only";

import { resolveMatchConnect, type MatchConnectInfo } from "@/lib/csgo-api/match-connect";

/**
 * Connect string para ranked — sempre derivado da partida CS:GO (serverId no match).
 * Sem fallback ao primeiro servidor da lista (evita mandar jogadores ao servidor errado).
 */
export async function resolveRankedConnect(
  csgoMatchId?: string | null,
): Promise<MatchConnectInfo> {
  if (!csgoMatchId) {
    return {
      serverHost: null,
      serverPort: null,
      selectedMap: null,
      matchStatus: "pending",
      csgoServerId: null,
    };
  }

  try {
    return await resolveMatchConnect(csgoMatchId);
  } catch {
    return {
      serverHost: null,
      serverPort: null,
      selectedMap: null,
      matchStatus: "unknown",
      csgoServerId: null,
    };
  }
}
