import { prisma } from "@/lib/prisma";
import { RankedPartyError } from "@/lib/ranked/party-service";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";
import { notifyPartyMembers } from "@/lib/realtime/notify";

export type RankedPartyMessageView = {
  id: string;
  userId: string;
  nickname: string;
  displayName: string;
  body: string;
  createdAt: string;
};

export const RANKED_CHAT_MAX_LENGTH = 300;

export async function listPartyMessages(
  partyId: string,
  limit = 60,
): Promise<RankedPartyMessageView[]> {
  const rows = await prisma.rankedPartyMessage.findMany({
    where: { partyId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: STEAM_DISPLAY_NAME_SELECT },
    },
  });

  return rows.map((row) => {
    const displayName = row.user ? resolveSteamDisplayName(row.user) : row.nickname;
    return {
      id: row.id,
      userId: row.userId,
      nickname: row.nickname,
      displayName,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    };
  });
}

export async function getPartyMessagesForUser(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });
  if (!membership) return [];
  return listPartyMessages(membership.partyId);
}

export async function postPartyMessage(userId: string, rawBody: string) {
  const body = rawBody.trim();
  if (!body) throw new RankedPartyError("emptyMessage", 400);
  if (body.length > RANKED_CHAT_MAX_LENGTH) {
    throw new RankedPartyError("messageTooLong", 400);
  }

  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });
  if (!membership) throw new RankedPartyError("notInPartyRoom", 400);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nickname: true },
  });
  if (!user) throw new RankedPartyError("userNotFound", 404);

  await prisma.rankedPartyMessage.create({
    data: {
      partyId: membership.partyId,
      userId,
      nickname: user.nickname,
      body,
    },
  });

  void notifyPartyMembers(membership.partyId, "chat");

  return listPartyMessages(membership.partyId);
}
