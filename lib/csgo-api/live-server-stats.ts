import "server-only";

import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/csgo-api/request-cache";
import { queryCsgoServersLive } from "@/lib/csgo-api/query-live-server";
import { syncCsgoPublicServers } from "@/lib/csgo-api/sync-public-servers";
import type { LiveServerQueryResult } from "@/lib/csgo-api/query-live-server";
import { formatConnectCommand } from "@/lib/servers/connect";

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
};

function toPayload(
  row: {
    id: string;
    name: string;
    mode: string;
    host: string;
    port: number;
    csgoServerId: string | null;
  },
  live: LiveServerQueryResult,
): LiveServerStatPayload {
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
  };
}

export async function fetchLiveServerStats(options?: { forceSync?: boolean }): Promise<LiveServerStatPayload[]> {
  if (options?.forceSync) {
    const { syncCsgoPublicServersForce } = await import("@/lib/csgo-api/sync-public-servers");
    await syncCsgoPublicServersForce();
  } else {
    await syncCsgoPublicServers();
  }

  return cached("live-server-stats", 10_000, async () => {
    const rows = await prisma.publicServer.findMany({
      where: {
        isLiveSynced: true,
        host: { not: null },
        port: { not: null },
      },
      orderBy: { sortOrder: "asc" },
    });

    const targets = rows
      .filter((row): row is typeof row & { host: string; port: number } => row.host != null && row.port != null)
      .map((row) => ({ host: row.host, port: row.port }));

    const liveByKey = await queryCsgoServersLive(targets);

    return rows
      .filter((row): row is typeof row & { host: string; port: number } => row.host != null && row.port != null)
      .map((row) => {
        const live = liveByKey.get(`${row.host}:${row.port}`) ?? {
          host: row.host,
          port: row.port,
          online: false,
          hostname: null,
          map: "Offline",
          mapRaw: null,
          players: 0,
          slots: 0,
          bots: 0,
          ping: 0,
        };
        return toPayload(row, live);
      });
  });
}
