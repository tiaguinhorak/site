import { prisma } from "@/lib/prisma";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

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
  displayName: string;
  actorNickname: string | null;
  actorDisplayName: string | null;
  createdAt: string;
  message: string;
};

function buildMessage(
  type: RankedPartyActivityType,
  displayName: string,
  actorDisplayName?: string | null,
): string {
  switch (type) {
    case "created":
      return `${displayName} criou a sala`;
    case "joined":
      return `${displayName} entrou na sala`;
    case "left":
      return `${displayName} saiu da sala`;
    case "kicked":
      return actorDisplayName
        ? `${displayName} foi removido por ${actorDisplayName}`
        : `${displayName} foi removido da sala`;
    case "disbanded":
      return "Sala desfeita pelo líder";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

async function resolveDisplayNames(nicknames: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(nicknames.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { nickname: { in: unique, mode: "insensitive" } },
    select: STEAM_DISPLAY_NAME_SELECT,
  });

  const map = new Map<string, string>();
  for (const user of users) {
    map.set(user.nickname.toLowerCase(), resolveSteamDisplayName(user));
  }
  for (const nick of unique) {
    if (!map.has(nick.toLowerCase())) map.set(nick.toLowerCase(), nick);
  }
  return map;
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

  const nicknames = rows.flatMap((row) =>
    [row.nickname, row.actorNickname].filter((n): n is string => Boolean(n)),
  );
  const nameMap = await resolveDisplayNames(nicknames);

  return rows.map((row) => {
    const displayName = nameMap.get(row.nickname.toLowerCase()) ?? row.nickname;
    const actorDisplayName = row.actorNickname
      ? nameMap.get(row.actorNickname.toLowerCase()) ?? row.actorNickname
      : null;
    return {
      id: row.id,
      type: row.type as RankedPartyActivityType,
      nickname: row.nickname,
      displayName,
      actorNickname: row.actorNickname,
      actorDisplayName,
      createdAt: row.createdAt.toISOString(),
      message: buildMessage(
        row.type as RankedPartyActivityType,
        displayName,
        actorDisplayName,
      ),
    };
  });
}

export async function getPartyActivitiesForUser(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });
  if (!membership) return [];
  return listPartyActivities(membership.partyId);
}
