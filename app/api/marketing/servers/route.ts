import { NextResponse } from "next/server";
import { getPublicServers, getSiteStats } from "@/lib/queries";
import { localizeSiteStats } from "@/lib/marketing/localize-content";
import { getRequestLocale } from "@/lib/i18n/server";
import { formatMapLabel } from "@/lib/servers/maps";

export async function GET() {
  const locale = await getRequestLocale();
  const [servers, stats] = await Promise.all([
    getPublicServers(),
    localizeSiteStats(await getSiteStats(), locale),
  ]);

  return NextResponse.json({
    serverCount: stats[0]?.value ?? "65+",
    servers: servers.map((s) => ({
      name: s.name,
      map: formatMapLabel(s.map),
      mode: s.mode,
      players: s.players,
      slots: s.slots,
      ping: s.ping,
      host: s.host,
      port: s.port,
      isLiveSynced: s.isLiveSynced,
    })),
  });
}
