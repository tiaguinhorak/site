import "server-only";

import { prisma } from "@/lib/prisma";
import { ClanError } from "@/lib/clans/service";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

export type ClanMessageView = {
  id: string;
  userId: string;
  nickname: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
};

export const CLAN_CHAT_MAX_LENGTH = 400;

async function assertClanMember(userId: string, clanId: string) {
  const membership = await prisma.clanMember.findUnique({
    where: { userId },
    select: { clanId: true },
  });
  if (!membership || membership.clanId !== clanId) {
    throw new ClanError("Você não pertence a este clã.", 403);
  }
}

export async function listClanMessages(
  userId: string,
  clanId: string,
  limit = 80,
): Promise<ClanMessageView[]> {
  await assertClanMember(userId, clanId);

  const rows = await prisma.clanMessage.findMany({
    where: { clanId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          ...STEAM_DISPLAY_NAME_SELECT,
          avatarUrl: true,
          avatarPreset: true,
          steamAvatarUrl: true,
        },
      },
    },
  });

  return rows.reverse().map((row) => ({
    id: row.id,
    userId: row.userId,
    nickname: row.user.nickname,
    displayName: resolveSteamDisplayName(row.user),
    avatarUrl: row.user.steamAvatarUrl ?? row.user.avatarUrl,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function postClanMessage(userId: string, clanId: string, rawBody: string) {
  const body = rawBody.trim();
  if (!body) throw new ClanError("Mensagem vazia.", 400);
  if (body.length > CLAN_CHAT_MAX_LENGTH) {
    throw new ClanError(`Máximo de ${CLAN_CHAT_MAX_LENGTH} caracteres.`, 400);
  }

  await assertClanMember(userId, clanId);

  const msg = await prisma.clanMessage.create({
    data: { clanId, userId, body },
    include: {
      user: {
        select: {
          ...STEAM_DISPLAY_NAME_SELECT,
          avatarUrl: true,
          steamAvatarUrl: true,
        },
      },
    },
  });

  return {
    id: msg.id,
    userId: msg.userId,
    nickname: msg.user.nickname,
    displayName: resolveSteamDisplayName(msg.user),
    avatarUrl: msg.user.steamAvatarUrl ?? msg.user.avatarUrl,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
  } satisfies ClanMessageView;
}
