import { prisma } from "@/lib/prisma";

export async function getActiveBan(userId: string) {
  const now = new Date();
  return prisma.punishment.findFirst({
    where: {
      userId,
      type: "BAN",
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      admin: { select: { nickname: true } },
    },
  });
}

export async function isUserBanned(userId: string) {
  const ban = await getActiveBan(userId);
  return Boolean(ban);
}

export async function listActivePunishmentsForUser(userId: string) {
  const now = new Date();
  return prisma.punishment.findMany({
    where: {
      userId,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      admin: { select: { id: true, nickname: true } },
    },
  });
}
