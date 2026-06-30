import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { formatMapLabel } from "@/lib/servers/maps";
import { getRequestLocale } from "@/lib/i18n/server";

const LIVE_STATUSES = ["accepting", "voting", "starting", "live"] as const;
type LiveStatus = (typeof LIVE_STATUSES)[number];

function isLiveStatus(value: string): value is LiveStatus {
  return (LIVE_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const locale = await getRequestLocale(request);
  const t = await getTranslations({ locale, namespace: "ranked.liveSessionStatus" });

  const sessions = await prisma.rankedMatchSession.findMany({
    where: { status: { in: ["accepting", "voting", "starting", "live"] } },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
    take: 20,
    select: {
      id: true,
      status: true,
      selectedMap: true,
      scoreTeamA: true,
      scoreTeamB: true,
      serverHost: true,
      serverPort: true,
      teamSize: true,
      partyA: {
        select: {
          members: { select: { user: { select: { nickname: true } } } },
        },
      },
      partyB: {
        select: {
          members: { select: { user: { select: { nickname: true } } } },
        },
      },
    },
  });

  return NextResponse.json({
    matches: sessions.map((session) => {
      const teamA = session.partyA.members.map((member) => member.user.nickname);
      const teamB = session.partyB.members.map((member) => member.user.nickname);
      const statusLabel = isLiveStatus(session.status)
        ? t(session.status)
        : session.status;

      return {
        id: session.id,
        status: session.status,
        statusLabel,
        map: session.selectedMap ? formatMapLabel(session.selectedMap) : null,
        mapRaw: session.selectedMap,
        scoreTeamA: session.scoreTeamA,
        scoreTeamB: session.scoreTeamB,
        playerCount: teamA.length + teamB.length,
        teamSize: session.teamSize,
        teamA,
        teamB,
        serverHost: session.serverHost,
        serverPort: session.serverPort,
      };
    }),
  });
}
