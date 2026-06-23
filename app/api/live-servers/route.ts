import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { fetchLiveServerStats } from "@/lib/csgo-api/live-server-stats";

export async function GET(request: NextRequest) {
  const servers = await fetchLiveServerStats();

  const user = await getSessionUser(request);
  const isAdmin = user?.isAdmin === true;

  return NextResponse.json({
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
      csgoServerId: isAdmin ? server.csgoServerId : null,
    })),
  });
}
