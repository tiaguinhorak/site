import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { fetchLiveServerStats } from "@/lib/csgo-api/live-server-stats";

export async function GET(request: NextRequest) {
  const poolFilter = request.nextUrl.searchParams.get("pool");
  let servers = await fetchLiveServerStats();

  if (poolFilter === "warmup") {
    servers = servers.filter((server) => server.pool === "warmup");
  } else if (poolFilter === "ranked") {
    servers = servers.filter((server) => server.pool !== "warmup");
  }

  const user = await getSessionUser(request);
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
