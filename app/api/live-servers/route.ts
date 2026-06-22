import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchLiveServerStats } from "@/lib/csgo-api/live-server-stats";
import { readSessionFromCookieHeader } from "@/lib/security/session";

export async function GET(request: NextRequest) {
  const servers = await fetchLiveServerStats();

  const session = readSessionFromCookieHeader(request.headers.get("cookie"));
  const isAdmin = session?.isAdmin === true;

  return NextResponse.json({
    isAdmin,
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
