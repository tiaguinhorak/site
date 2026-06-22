import { prisma } from "@/lib/prisma";

export type RankedPartyActivityType =
  | "created"
  | "joined"
  | "left"
  | "kicked"
  | "disbanded";

export type RankedPartyActivityView = {
  id: string;
  type: RankedPartyActivityType;
  nickname: string;
  actorNickname: string | null;
  createdAt: string;
  message: string;
};

function buildMessage(
  type: RankedPartyActivityType,
  nickname: string,
  actorNickname?: string | null,
): string {
  switch (type) {
    case "created":
      return `${nickname} criou a sala`;
    case "joined":
      return `${nickname} entrou na sala`;
    case "left":
      return `${nickname} saiu da sala`;
    case "kicked":
      return actorNickname
        ? `${nickname} foi removido por ${actorNickname}`
        : `${nickname} foi removido da sala`;
    case "disbanded":
      return "Sala desfeita pelo líder";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export async function logRankedPartyActivity(
  partyId: string,
  type: RankedPartyActivityType,
  nickname: string,
  actorNickname?: string | null,
) {
  await prisma.rankedPartyActivity.create({
    data: {
      partyId,
      type,
      nickname,
      actorNickname: actorNickname ?? null,
    },
  });
}

export async function listPartyActivities(
  partyId: string,
  limit = 50,
): Promise<RankedPartyActivityView[]> {
  const rows = await prisma.rankedPartyActivity.findMany({
    where: { partyId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type as RankedPartyActivityType,
    nickname: row.nickname,
    actorNickname: row.actorNickname,
    createdAt: row.createdAt.toISOString(),
    message: buildMessage(
      row.type as RankedPartyActivityType,
      row.nickname,
      row.actorNickname,
    ),
  }));
}

export async function getPartyActivitiesForUser(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });
  if (!membership) return [];
  return listPartyActivities(membership.partyId);
}
