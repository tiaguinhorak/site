import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchLiveServerStats } from "@/lib/csgo-api/live-server-stats";
import { requireSession } from "@/lib/security/api-guard";

export async function GET(request: NextRequest) {
  const servers = await fetchLiveServerStats();

  const { session } = requireSession(request);
  let isAdmin = false;
  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isAdmin: true },
    });
    isAdmin = user?.isAdmin ?? false;
  }

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
