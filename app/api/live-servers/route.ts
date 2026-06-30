import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { fetchLiveServerStats } from "@/lib/csgo-api/live-server-stats";

function parsePoolFilter(value: string | null): "ranked" | "warmup" | undefined {
  if (value === "warmup" || value === "ranked") return value;
  return undefined;
}

export async function GET(request: NextRequest) {
  const poolFilter = parsePoolFilter(request.nextUrl.searchParams.get("pool"));
  const forceSync = request.nextUrl.searchParams.get("sync") === "1";

  const [servers, user] = await Promise.all([
    fetchLiveServerStats({ pool: poolFilter, forceSync }),
    getSessionUser(request),
  ]);

  const isAdmin = user?.isAdmin === true;

  return NextResponse.json(
    {
      servers: servers.map((server) => ({
        id: server.id,
        name: server.name,
        map: server.map,
        mode: server.mode,
        host: server.host,
        port: server.port,
        players: server.players,
        slots: server.slots,
        ping: server.ping,
        online: server.online,
        connectCommand: server.connectCommand,
        pool: server.pool,
        csgoServerId: isAdmin ? server.csgoServerId : null,
      })),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=8, stale-while-revalidate=20",
      },
    },
  );
}
