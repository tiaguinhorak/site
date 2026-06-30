import "server-only";

import type { ClanRole, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";

export const CLAN_MAX_MEMBERS = 20;
export const CLAN_TAG_REGEX = /^[A-Z0-9]{2,6}$/;
export const CLAN_NAME_MIN = 3;
export const CLAN_NAME_MAX = 24;

export class ClanError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

const MEMBER_USER_SELECT = {
  id: true,
  nickname: true,
  country: true,
  avatarUrl: true,
  avatarPreset: true,
  steamAvatarUrl: true,
  plan: true,
  level: true,
  elo: true,
  competitivePoints: true,
  xp: true,
  rankedKills: true,
  rankedWins: true,
  rankedMvps: true,
} satisfies Prisma.UserSelect;

export type ClanMemberView = {
  userId: string;
  nickname: string;
  country: string;
  avatarUrl: string | null;
  role: ClanRole;
  level: number;
  elo: number;
  points: number;
  kills: number;
  wins: number;
  mvps: number;
  joinedAt: string;
};

export type ClanStats = {
  memberCount: number;
  totalPoints: number;
  totalXp: number;
  totalKills: number;
  totalWins: number;
  totalMvps: number;
  avgElo: number;
};

export type ClanDetail = {
  id: string;
  tag: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
  createdAt: string;
  stats: ClanStats;
  members: ClanMemberView[];
  viewerRole: ClanRole | null;
};

export type ClanRankingEntry = {
  id: string;
  tag: string;
  name: string;
  avatarUrl: string | null;
  rank: number;
  memberCount: number;
  totalPoints: number;
  totalXp: number;
  avgElo: number;
};

type ClanWithMembers = Prisma.ClanGetPayload<{
  include: { members: { include: { user: { select: typeof MEMBER_USER_SELECT } } } };
}>;

function computeStats(clan: ClanWithMembers): ClanStats {
  const members = clan.members;
  const memberCount = members.length;
  let totalPoints = 0;
  let totalXp = 0;
  let totalKills = 0;
  let totalWins = 0;
  let totalMvps = 0;
  let eloSum = 0;
  for (const m of members) {
    totalPoints += m.user.competitivePoints;
    totalXp += m.user.xp;
    totalKills += m.user.rankedKills;
    totalWins += m.user.rankedWins;
    totalMvps += m.user.rankedMvps;
    eloSum += m.user.elo;
  }
  return {
    memberCount,
    totalPoints,
    totalXp,
    totalKills,
    totalWins,
    totalMvps,
    avgElo: memberCount > 0 ? Math.round(eloSum / memberCount) : 0,
  };
}

function serializeMember(member: ClanWithMembers["members"][number]): ClanMemberView {
  const u = member.user;
  return {
    userId: u.id,
    nickname: u.nickname,
    country: u.country,
    avatarUrl: resolveUserAvatarUrl(u),
    role: member.role,
    level: u.level,
    elo: u.elo,
    points: u.competitivePoints,
    kills: u.rankedKills,
    wins: u.rankedWins,
    mvps: u.rankedMvps,
    joinedAt: member.joinedAt.toISOString(),
  };
}

const ROLE_WEIGHT: Record<ClanRole, number> = { OWNER: 0, OFFICER: 1, MEMBER: 2 };

export async function getUserClanId(userId: string): Promise<string | null> {
  const membership = await prisma.clanMember.findUnique({
    where: { userId },
    select: { clanId: true },
  });
  return membership?.clanId ?? null;
}

export async function createClan(
  userId: string,
  input: { tag: string; name: string; description?: string },
): Promise<ClanDetail> {
  const tag = input.tag.trim().toUpperCase();
  const name = input.name.trim();
  const description = (input.description ?? "").trim().slice(0, 500);

  if (!CLAN_TAG_REGEX.test(tag)) {
    throw new ClanError("Tag inválida (2-6 letras/números).", 400);
  }
  if (name.length < CLAN_NAME_MIN || name.length > CLAN_NAME_MAX) {
    throw new ClanError("Nome inválido (3-24 caracteres).", 400);
  }

  const existingMembership = await getUserClanId(userId);
  if (existingMembership) {
    throw new ClanError("Você já faz parte de um clã.");
  }

  const [tagTaken, nameTaken] = await Promise.all([
    prisma.clan.findUnique({ where: { tag }, select: { id: true } }),
    prisma.clan.findUnique({ where: { name }, select: { id: true } }),
  ]);
  if (tagTaken) throw new ClanError("Essa tag já está em uso.");
  if (nameTaken) throw new ClanError("Esse nome já está em uso.");

  const clan = await prisma.clan.create({
    data: {
      tag,
      name,
      description,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
    },
  });

  return getClanDetail(clan.id, userId);
}

export async function joinClan(userId: string, clanId: string): Promise<ClanDetail> {
  const existingMembership = await getUserClanId(userId);
  if (existingMembership) {
    throw new ClanError("Você já faz parte de um clã.");
  }

  const clan = await prisma.clan.findUnique({
    where: { id: clanId },
    select: { id: true, _count: { select: { members: true } } },
  });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);
  if (clan._count.members >= CLAN_MAX_MEMBERS) {
    throw new ClanError("Este clã está cheio.");
  }

  await prisma.clanMember.create({ data: { clanId, userId, role: "MEMBER" } });
  return getClanDetail(clanId, userId);
}

export async function leaveClan(userId: string): Promise<void> {
  const membership = await prisma.clanMember.findUnique({
    where: { userId },
    include: { clan: { include: { members: true } } },
  });
  if (!membership) throw new ClanError("Você não está em um clã.", 400);

  const clan = membership.clan;
  const others = clan.members.filter((m) => m.userId !== userId);

  if (membership.role !== "OWNER") {
    await prisma.clanMember.delete({ where: { userId } });
    return;
  }

  // Owner leaving: transfer ownership or disband if last member.
  if (others.length === 0) {
    await prisma.clan.delete({ where: { id: clan.id } });
    return;
  }

  const successor =
    [...others].sort((a, b) => {
      const roleDiff = ROLE_WEIGHT[a.role] - ROLE_WEIGHT[b.role];
      if (roleDiff !== 0) return roleDiff;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    })[0] ?? others[0];

  await prisma.$transaction([
    prisma.clanMember.delete({ where: { userId } }),
    prisma.clanMember.update({ where: { id: successor.id }, data: { role: "OWNER" } }),
    prisma.clan.update({ where: { id: clan.id }, data: { ownerId: successor.userId } }),
  ]);
}

export async function disbandClan(userId: string, clanId: string): Promise<void> {
  const clan = await prisma.clan.findUnique({ where: { id: clanId }, select: { ownerId: true } });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);
  if (clan.ownerId !== userId) throw new ClanError("Apenas o líder pode dissolver o clã.", 403);
  await prisma.clan.delete({ where: { id: clanId } });
}

async function requireManager(actorId: string, clanId: string): Promise<ClanRole> {
  const actor = await prisma.clanMember.findUnique({ where: { userId: actorId } });
  if (!actor || actor.clanId !== clanId) {
    throw new ClanError("Você não pertence a este clã.", 403);
  }
  if (actor.role === "MEMBER") {
    throw new ClanError("Permissão insuficiente.", 403);
  }
  return actor.role;
}

export async function kickMember(
  actorId: string,
  clanId: string,
  targetUserId: string,
): Promise<void> {
  if (actorId === targetUserId) throw new ClanError("Use sair do clã.", 400);
  const actorRole = await requireManager(actorId, clanId);

  const target = await prisma.clanMember.findUnique({ where: { userId: targetUserId } });
  if (!target || target.clanId !== clanId) {
    throw new ClanError("Membro não encontrado.", 404);
  }
  if (target.role === "OWNER") throw new ClanError("Não é possível remover o líder.", 403);
  if (target.role === "OFFICER" && actorRole !== "OWNER") {
    throw new ClanError("Apenas o líder pode remover oficiais.", 403);
  }
  await prisma.clanMember.delete({ where: { userId: targetUserId } });
}

export async function setMemberRole(
  actorId: string,
  clanId: string,
  targetUserId: string,
  role: Extract<ClanRole, "OFFICER" | "MEMBER">,
): Promise<void> {
  const clan = await prisma.clan.findUnique({ where: { id: clanId }, select: { ownerId: true } });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);
  if (clan.ownerId !== actorId) {
    throw new ClanError("Apenas o líder pode alterar cargos.", 403);
  }

  const target = await prisma.clanMember.findUnique({ where: { userId: targetUserId } });
  if (!target || target.clanId !== clanId) {
    throw new ClanError("Membro não encontrado.", 404);
  }
  if (target.role === "OWNER") throw new ClanError("Não é possível alterar o líder.", 400);

  await prisma.clanMember.update({ where: { userId: targetUserId }, data: { role } });
}

export async function getClanDetail(
  clanId: string,
  viewerId?: string | null,
): Promise<ClanDetail> {
  const clan = await prisma.clan.findUnique({
    where: { id: clanId },
    include: { members: { include: { user: { select: MEMBER_USER_SELECT } } } },
  });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);

  const members = [...clan.members]
    .map(serializeMember)
    .sort((a, b) => {
      const roleDiff = ROLE_WEIGHT[a.role] - ROLE_WEIGHT[b.role];
      if (roleDiff !== 0) return roleDiff;
      return b.points - a.points;
    });

  const viewerRole = viewerId
    ? clan.members.find((m) => m.userId === viewerId)?.role ?? null
    : null;

  return {
    id: clan.id,
    tag: clan.tag,
    name: clan.name,
    description: clan.description,
    avatarUrl: clan.avatarUrl,
    ownerId: clan.ownerId,
    createdAt: clan.createdAt.toISOString(),
    stats: computeStats(clan),
    members,
    viewerRole,
  };
}

export async function getUserClanDetail(userId: string): Promise<ClanDetail | null> {
  const clanId = await getUserClanId(userId);
  if (!clanId) return null;
  return getClanDetail(clanId, userId);
}

export async function listClanRanking(limit = 50): Promise<ClanRankingEntry[]> {
  const clans = await prisma.clan.findMany({
    include: { members: { include: { user: { select: MEMBER_USER_SELECT } } } },
  });

  const entries = clans
    .map((clan) => {
      const stats = computeStats(clan);
      return {
        id: clan.id,
        tag: clan.tag,
        name: clan.name,
        avatarUrl: clan.avatarUrl,
        rank: 0,
        memberCount: stats.memberCount,
        totalPoints: stats.totalPoints,
        totalXp: stats.totalXp,
        avgElo: stats.avgElo,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.totalXp - a.totalXp)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return entries;
}
