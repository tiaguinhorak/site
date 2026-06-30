import "server-only";

import { randomBytes } from "crypto";
import type { Plan } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyDiscordPlanSyncForUser, notifyDiscordUnlinkForUser } from "@/lib/discord/sync-user";

const CODE_TTL_MS = 10 * 60 * 1000;

function generateCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

function planToClient(plan: Plan): "free" | "premium" | "elite" {
  switch (plan) {
    case "PREMIUM":
      return "premium";
    case "ELITE":
      return "elite";
    default:
      return "free";
  }
}

export class DiscordLinkError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DiscordLinkError";
  }
}

export async function createDiscordLinkCode(input: {
  discordUserId: string;
  discordUsername: string;
}): Promise<{ code: string; expiresAt: Date }> {
  const alreadyLinked = await prisma.user.findFirst({
    where: { discordUserId: input.discordUserId },
    select: { nickname: true },
  });
  if (alreadyLinked) {
    throw new DiscordLinkError(
      "Esta conta Discord já está vinculada ao site. Desvincule em Perfil → Discord.",
      409,
    );
  }

  await prisma.discordLinkCode.deleteMany({
    where: {
      OR: [
        { discordUserId: input.discordUserId, usedAt: null },
        { expiresAt: { lt: new Date() } },
      ],
    },
  });

  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const exists = await prisma.discordLinkCode.findUnique({ where: { code } });
    if (!exists) break;
    code = generateCode();
  }

  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await prisma.discordLinkCode.create({
    data: {
      code,
      discordUserId: input.discordUserId,
      discordUsername: input.discordUsername.slice(0, 64),
      expiresAt,
    },
  });

  return { code, expiresAt };
}

export async function redeemDiscordLinkCode(userId: string, rawCode: string): Promise<{
  discordUserId: string;
  discordUsername: string | null;
  plan: "free" | "premium" | "elite";
}> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    throw new DiscordLinkError("Código inválido.", 400);
  }

  const row = await prisma.discordLinkCode.findUnique({ where: { code } });
  if (!row || row.usedAt) {
    throw new DiscordLinkError("Código inválido ou já utilizado.", 400);
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new DiscordLinkError("Código expirado. Gere outro com /vincular no Discord.", 400);
  }

  const existingUser = await prisma.user.findFirst({
    where: { discordUserId: row.discordUserId },
    select: { id: true },
  });
  if (existingUser && existingUser.id !== userId) {
    throw new DiscordLinkError("Esta conta Discord já está vinculada a outro jogador.", 409);
  }

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordUserId: true, plan: true },
  });
  if (!current) {
    throw new DiscordLinkError("Usuário não encontrado.", 404);
  }
  if (current.discordUserId && current.discordUserId !== row.discordUserId) {
    throw new DiscordLinkError("Desvincule sua conta Discord atual antes de vincular outra.", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.discordLinkCode.update({
      where: { id: row.id },
      data: { usedAt: new Date(), userId },
    });

    return tx.user.update({
      where: { id: userId },
      data: {
        discordUserId: row.discordUserId,
        discordUsername: row.discordUsername,
        discordLinkedAt: new Date(),
      },
      select: { discordUserId: true, discordUsername: true, plan: true },
    });
  });

  const plan = planToClient(updated.plan);
  void notifyDiscordPlanSyncForUser(userId);

  return {
    discordUserId: updated.discordUserId!,
    discordUsername: updated.discordUsername,
    plan,
  };
}

export async function unlinkDiscordAccount(userId: string): Promise<void> {
  await notifyDiscordUnlinkForUser(userId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      discordUserId: null,
      discordUsername: null,
      discordLinkedAt: null,
    },
  });
}

export async function listLinkedDiscordUsers(): Promise<
  Array<{
    discordUserId: string;
    plan: "free" | "premium" | "elite";
    nickname: string;
    steamLinked: boolean;
  }>
> {
  const users = await prisma.user.findMany({
    where: { discordUserId: { not: null } },
    select: { discordUserId: true, plan: true, nickname: true, steamId: true },
  });

  return users
    .filter((user): user is typeof user & { discordUserId: string } => user.discordUserId != null)
    .map((user) => ({
      discordUserId: user.discordUserId,
      plan: planToClient(user.plan),
      nickname: user.nickname,
      steamLinked: Boolean(user.steamId),
    }));
}

export async function getDiscordLinkStatus(userId: string): Promise<{
  linked: boolean;
  discordUserId: string | null;
  discordUsername: string | null;
  discordLinkedAt: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      discordUserId: true,
      discordUsername: true,
      discordLinkedAt: true,
    },
  });

  return {
    linked: Boolean(user?.discordUserId),
    discordUserId: user?.discordUserId ?? null,
    discordUsername: user?.discordUsername ?? null,
    discordLinkedAt: user?.discordLinkedAt?.toISOString() ?? null,
  };
}
