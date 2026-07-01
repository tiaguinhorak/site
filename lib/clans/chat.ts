import { prisma } from "@/lib/prisma";
import {
  serializeSocialUser,
  SOCIAL_USER_SELECT,
} from "@/lib/profile/serialize-social-user";
import { ClanError } from "@/lib/clans/service";

export type ClanMessageView = {
  id: string;
  userId: string;
  nickname: string;
  displayName: string;
  country: string;
  avatarUrl: string | null;
  plan: string;
  level: number;
  elo: number;
  customization: ReturnType<typeof serializeSocialUser>["customization"];
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
      user: { select: SOCIAL_USER_SELECT },
    },
  });

  return rows.reverse().map((row) => ({
    id: row.id,
    ...serializeSocialUser(row.user),
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
      user: { select: SOCIAL_USER_SELECT },
    },
  });

  return {
    id: msg.id,
    ...serializeSocialUser(msg.user),
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
  } satisfies ClanMessageView;
}
