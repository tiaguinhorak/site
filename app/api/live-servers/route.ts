import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { fetchLiveServerStats } from "@/lib/csgo-api/live-server-stats";

function parsePoolFilter(value: string | null): "ranked" | "warmup" | undefined {
  if (value === "warmup" || value === "ranked") return value;
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const poolFilter = parsePoolFilter(request.nextUrl.searchParams.get("pool"));
    const forceSync = request.nextUrl.searchParams.get("sync") === "1";

    if (forceSync) {
      try {
        const { syncCsgoPublicServersForce } = await import("@/lib/csgo-api/sync-public-servers");
        await syncCsgoPublicServersForce();
      } catch (syncError) {
        console.error("[live-servers] sync failed:", syncError);
      }
    }

    const [servers, user] = await Promise.all([
      fetchLiveServerStats({ pool: poolFilter, forceSync: false }),
      getSessionUser(request),
    ]);

    const isAdmin = user?.isAdmin === true;

    return NextResponse.json(
      {
        servers: servers.map((server) => ({
          id: server.id,
          name: server.name,
          map: server.map,
          mapId: server.mapId,
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
  } catch (error) {
    console.error("[live-servers]", error);
    return NextResponse.json({ error: "Failed to load live servers" }, { status: 500 });
  }
}
