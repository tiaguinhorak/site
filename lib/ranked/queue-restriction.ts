import "server-only";

import { prisma } from "@/lib/prisma";
import {
  RANKED_FREE_DODGE_COUNT,
  RANKED_QUEUE_SERVER_NAME,
  buildRestrictionView,
  getEffectiveRankedDodges,
  getRankedBanMinutesForDodgeCount,
  type RankedQueueRestrictionView,
} from "@/lib/ranked/queue-restriction-shared";

export type { RankedQueueLastEvent, RankedQueueRestrictionView } from "@/lib/ranked/queue-restriction-shared";
export {
  RANKED_QUEUE_BAN_MINUTES,
  RANKED_FREE_DODGE_COUNT,
  RANKED_DODGE_DECAY_HOURS,
  RANKED_QUEUE_SERVER_NAME,
  buildRestrictionView,
  formatRestrictionDuration,
  getEffectiveRankedDodges,
  getNextBanMinutes,
  getRankedBanMinutesForDodgeCount,
} from "@/lib/ranked/queue-restriction-shared";

async function revokeActiveRankedQueuePunishments(
  userId: string,
  revokedById: string,
) {
  const now = new Date();
  await prisma.punishment.updateMany({
    where: {
      userId,
      type: "RESTRICT",
      serverName: RANKED_QUEUE_SERVER_NAME,
      active: true,
    },
    data: {
      active: false,
      revokedAt: now,
      revokedById,
    },
  });
}

async function createRankedQueuePunishment(options: {
  userId: string;
  adminId: string;
  type: "WARNING" | "RESTRICT";
  reason: string;
  notes: string;
  expiresAt?: Date | null;
}) {
  await prisma.punishment.create({
    data: {
      userId: options.userId,
      adminId: options.adminId,
      type: options.type,
      scope: "PLATFORM",
      serverName: RANKED_QUEUE_SERVER_NAME,
      reason: options.reason,
      notes: options.notes,
      expiresAt: options.expiresAt ?? null,
    },
  });
}

export async function getRankedQueueRestrictionForUser(
  userId: string,
): Promise<RankedQueueRestrictionView | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      rankedQueueDodges: true,
      rankedRestrictedUntil: true,
      rankedLastDodgeAt: true,
    },
  });
  if (!user) return null;
  return buildRestrictionView(user);
}

export async function applyRankedQueueDodge(
  userId: string,
  reason: "timeout" | "leave",
): Promise<RankedQueueRestrictionView> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      rankedQueueDodges: true,
      rankedRestrictedUntil: true,
      rankedLastDodgeAt: true,
    },
  });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const effectiveDodges = getEffectiveRankedDodges(user);
  const nextDodges = effectiveDodges + 1;
  const now = new Date();

  const systemAdmin = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const reasonLabel =
    reason === "leave"
      ? "Saiu sem confirmar partida rankeada"
      : "Não confirmou partida rankeada a tempo";

  if (nextDodges <= RANKED_FREE_DODGE_COUNT) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        rankedQueueDodges: nextDodges,
        rankedRestrictedUntil: null,
        rankedLastDodgeAt: now,
      },
    });

    if (systemAdmin) {
      await createRankedQueuePunishment({
        userId,
        adminId: systemAdmin.id,
        type: "WARNING",
        reason: `${reasonLabel} (${nextDodges}ª ocorrência — aviso sem restrição)`,
        notes: "Primeiro cancelamento: aviso automático, sem bloqueio de fila.",
      });
    }

    return buildRestrictionView(
      {
        rankedQueueDodges: nextDodges,
        rankedRestrictedUntil: null,
        rankedLastDodgeAt: now,
      },
      "warning",
    );
  }

  const banMinutes = getRankedBanMinutesForDodgeCount(nextDodges);
  const restrictedUntil = new Date(Date.now() + banMinutes * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      rankedQueueDodges: nextDodges,
      rankedRestrictedUntil: restrictedUntil,
      rankedLastDodgeAt: now,
    },
  });

  if (systemAdmin) {
    await revokeActiveRankedQueuePunishments(userId, systemAdmin.id);
    await createRankedQueuePunishment({
      userId,
      adminId: systemAdmin.id,
      type: "RESTRICT",
      reason: `${reasonLabel} (${nextDodges}ª ocorrência)`,
      notes: `Restrição automática de ${banMinutes} min na fila 5x5.`,
      expiresAt: restrictedUntil,
    });
  }

  return buildRestrictionView(
    {
      rankedQueueDodges: nextDodges,
      rankedRestrictedUntil: restrictedUntil,
      rankedLastDodgeAt: now,
    },
    "restricted",
  );
}

export async function adminApplyRankedQueueRestriction(
  userId: string,
  adminId: string,
  minutes: number,
  reason: string,
  incrementDodge = true,
): Promise<RankedQueueRestrictionView> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      rankedQueueDodges: true,
      rankedRestrictedUntil: true,
      rankedLastDodgeAt: true,
    },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  const now = new Date();
  const restrictedUntil = new Date(now.getTime() + minutes * 60 * 1000);
  const effectiveDodges = getEffectiveRankedDodges(user);
  const nextDodges = incrementDodge
    ? Math.max(effectiveDodges + 1, 2)
    : effectiveDodges;

  await prisma.user.update({
    where: { id: userId },
    data: {
      rankedQueueDodges: nextDodges,
      rankedRestrictedUntil: restrictedUntil,
      rankedLastDodgeAt: now,
    },
  });

  await revokeActiveRankedQueuePunishments(userId, adminId);
  await createRankedQueuePunishment({
    userId,
    adminId,
    type: "RESTRICT",
    reason,
    notes: `Restrição manual de ${minutes} min na fila rankeada (admin).`,
    expiresAt: restrictedUntil,
  });

  return buildRestrictionView(
    {
      rankedQueueDodges: nextDodges,
      rankedRestrictedUntil: restrictedUntil,
      rankedLastDodgeAt: now,
    },
    "restricted",
  );
}

export async function adminClearRankedQueueRestriction(
  userId: string,
  adminId: string,
  resetDodges: boolean,
): Promise<RankedQueueRestrictionView> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      rankedQueueDodges: true,
      rankedRestrictedUntil: true,
      rankedLastDodgeAt: true,
    },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.user.update({
    where: { id: userId },
    data: {
      rankedRestrictedUntil: null,
      ...(resetDodges
        ? { rankedQueueDodges: 0, rankedLastDodgeAt: null }
        : {}),
    },
  });

  await revokeActiveRankedQueuePunishments(userId, adminId);

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      rankedQueueDodges: true,
      rankedRestrictedUntil: true,
      rankedLastDodgeAt: true,
    },
  });

  return buildRestrictionView(updated ?? user);
}
