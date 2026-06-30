import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatMapLabel } from "@/lib/servers/maps";

const STATUS_LABELS: Record<string, string> = {
  accepting: "Aceitando jogadores",
  voting: "Veto de mapas",
  starting: "Iniciando",
  live: "Ao vivo",
};

export async function GET() {
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

      return {
        id: session.id,
        status: session.status,
        statusLabel: STATUS_LABELS[session.status] ?? session.status,
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
