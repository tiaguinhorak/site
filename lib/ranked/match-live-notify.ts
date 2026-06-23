import "server-only";

import { prisma } from "@/lib/prisma";
import { publishRealtime } from "@/lib/realtime/bus";
import type { RealtimeChannel } from "@/lib/realtime/types";

export type MatchLivePush = {
  sessionId: string;
  scoreTeamA: number;
  scoreTeamB: number;
  round: number;
  phase: string;
};

export async function publishMatchLiveToParticipants(payload: MatchLivePush): Promise<void> {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: payload.sessionId },
    include: {
      partyA: { include: { members: { select: { userId: true } } } },
      partyB: { include: { members: { select: { userId: true } } } },
    },
  });
  if (!session) return;

  const userIds = new Set<string>();
  for (const m of session.partyA.members) userIds.add(m.userId);
  for (const m of session.partyB.members) userIds.add(m.userId);

  const channels: RealtimeChannel[] = [
    { kind: "ranked_rooms" },
    ...[...userIds].map((userId) => ({ kind: "user" as const, userId })),
  ];

  publishRealtime(channels, {
    type: "match_live",
    at: Date.now(),
    sessionId: payload.sessionId,
    scoreTeamA: payload.scoreTeamA,
    scoreTeamB: payload.scoreTeamB,
    round: payload.round,
    phase: payload.phase,
  });
}
