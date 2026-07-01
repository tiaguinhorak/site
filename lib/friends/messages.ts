import "server-only";

import { prisma } from "@/lib/prisma";
import { areFriends, FriendError } from "@/lib/friends/service";
import { publishDirectMessage } from "@/lib/realtime/notify";
import type { DirectMessagePayload } from "@/lib/realtime/types";

export const DM_MAX_LENGTH = 1000;

export type DirectMessageView = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

function toView(
  message: {
    id: string;
    senderId: string;
    recipientId: string;
    body: string;
    createdAt: Date;
  },
  meId: string,
): DirectMessageView {
  return {
    id: message.id,
    senderId: message.senderId,
    recipientId: message.recipientId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    mine: message.senderId === meId,
  };
}

/** Load the most recent messages of a 1:1 conversation (oldest first). */
export async function getConversation(
  userId: string,
  otherUserId: string,
  limit = 50,
): Promise<DirectMessageView[]> {
  if (userId === otherUserId) return [];
  const rows = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  // Mark messages sent to me as read.
  await prisma.directMessage.updateMany({
    where: { senderId: otherUserId, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });

  return rows.reverse().map((row) => toView(row, userId));
}

/** Count unread messages grouped by sender. */
export async function getUnreadCounts(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.directMessage.groupBy({
    by: ["senderId"],
    where: { recipientId: userId, readAt: null },
    _count: { _all: true },
  });
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.senderId] = row._count._all;
  }
  return result;
}

export async function sendDirectMessage(
  userId: string,
  recipientId: string,
  body: string,
): Promise<DirectMessageView> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new FriendError("Mensagem vazia.", 400);
  }
  if (trimmed.length > DM_MAX_LENGTH) {
    throw new FriendError("Mensagem muito longa.", 400);
  }
  if (userId === recipientId) {
    throw new FriendError("Você não pode enviar mensagem para si mesmo.", 400);
  }
  if (!(await areFriends(userId, recipientId))) {
    throw new FriendError("Vocês não são amigos.", 403);
  }

  const created = await prisma.directMessage.create({
    data: { senderId: userId, recipientId, body: trimmed },
  });

  const payload: DirectMessagePayload = {
    id: created.id,
    senderId: created.senderId,
    recipientId: created.recipientId,
    body: created.body,
    createdAt: created.createdAt.toISOString(),
  };
  publishDirectMessage(payload);

  return toView(created, userId);
}
