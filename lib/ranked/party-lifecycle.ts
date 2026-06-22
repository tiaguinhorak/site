import "server-only";

import { prisma } from "@/lib/prisma";
import { RANKED_TEAM_SIZE } from "@/lib/ranked";

export function partyStatusFromMemberCount(
  memberCount: number,
  teamSize: number,
): "open" | "full" {
  return memberCount >= teamSize ? "full" : "open";
}

export async function resetPartiesAfterSession(
  partyAId: string,
  partyBId: string,
  teamSize = RANKED_TEAM_SIZE,
) {
  for (const partyId of [partyAId, partyBId]) {
    const party = await prisma.rankedParty.findUnique({
      where: { id: partyId },
      include: { members: true },
    });
    if (!party || party.status === "disbanded") continue;

    const nextStatus = partyStatusFromMemberCount(party.members.length, teamSize);
    if (party.status !== nextStatus) {
      await prisma.rankedParty.update({
        where: { id: partyId },
        data: { status: nextStatus },
      });
    }
  }
}

export async function markPartiesInMatch(partyAId: string, partyBId: string) {
  await prisma.rankedParty.updateMany({
    where: { id: { in: [partyAId, partyBId] }, status: { not: "disbanded" } },
    data: { status: "in_match" },
  });
}

export async function releaseLobbyRoomAfterMatch(lobbyRoomId: string | null | undefined) {
  if (!lobbyRoomId) return;
  await prisma.lobbyRoom.updateMany({
    where: { id: lobbyRoomId },
    data: { status: "open", matchId: null },
  });
}
