import "server-only";

import type { ClanRole, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  serializeSocialUser,
  SOCIAL_USER_SELECT,
} from "@/lib/profile/serialize-social-user";
import type { SerializedSocialUser } from "@/lib/profile/social-user";
import { resolveSteamId64 } from "@/lib/steam/friends";

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
  ...SOCIAL_USER_SELECT,
  competitivePoints: true,
  xp: true,
  rankedKills: true,
  rankedWins: true,
  rankedMvps: true,
} satisfies Prisma.UserSelect;

export type ClanMemberView = SerializedSocialUser & {
  role: ClanRole;
  points: number;
  kills: number;
  wins: number;
  mvps: number;
  joinedAt: string;
};

export type ClanLeaderPreview = SerializedSocialUser;

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
  joinMode: "OPEN" | "CLOSED";
  ownerId: string;
  createdAt: string;
  stats: ClanStats;
  members: ClanMemberView[];
  viewerRole: ClanRole | null;
  pendingRequests: ClanJoinRequestView[];
};

export type ClanJoinRequestView = SerializedSocialUser & {
  id: string;
  message: string;
  createdAt: string;
};

export type ClanRankingEntry = {
  id: string;
  tag: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  joinMode: "OPEN" | "CLOSED";
  rank: number;
  memberCount: number;
  totalPoints: number;
  totalXp: number;
  totalKills: number;
  totalWins: number;
  totalMvps: number;
  avgElo: number;
  leader: ClanLeaderPreview | null;
};

export type ClanBrowseSort = "points" | "elo" | "members" | "wins";
export type ClanBrowseJoinMode = "OPEN" | "CLOSED" | "ALL";

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
  const base = serializeSocialUser(member.user);
  const u = member.user;
  return {
    ...base,
    role: member.role,
    points: u.competitivePoints,
    kills: u.rankedKills,
    wins: u.rankedWins,
    mvps: u.rankedMvps,
    joinedAt: member.joinedAt.toISOString(),
  };
}

function serializeLeader(clan: ClanWithMembers): ClanLeaderPreview | null {
  const ownerMember = clan.members.find((m) => m.role === "OWNER");
  if (!ownerMember) return null;
  return serializeSocialUser(ownerMember.user);
}

function buildRankingEntry(
  clan: ClanWithMembers,
  stats: ClanStats,
  rank: number,
): Omit<ClanRankingEntry, "rank"> & { rank: number } {
  return {
    id: clan.id,
    tag: clan.tag,
    name: clan.name,
    description: clan.description,
    avatarUrl: clan.avatarUrl,
    joinMode: clan.joinMode,
    rank,
    memberCount: stats.memberCount,
    totalPoints: stats.totalPoints,
    totalXp: stats.totalXp,
    totalKills: stats.totalKills,
    totalWins: stats.totalWins,
    totalMvps: stats.totalMvps,
    avgElo: stats.avgElo,
    leader: serializeLeader(clan),
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
  input: { tag: string; name: string; description?: string; joinMode?: "OPEN" | "CLOSED" },
): Promise<ClanDetail> {
  const tag = input.tag.trim().toUpperCase();
  const name = input.name.trim();
  const description = (input.description ?? "").trim().slice(0, 500);
  const joinMode = input.joinMode ?? "OPEN";

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!owner || owner.plan !== "ELITE") {
    throw new ClanError("Somente assinantes Elite podem criar clãs.", 403);
  }

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
      joinMode,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
    },
  });

  return getClanDetail(clan.id, userId);
}

export async function updateClanSettings(
  actorId: string,
  clanId: string,
  input: { description?: string; joinMode?: "OPEN" | "CLOSED" },
): Promise<ClanDetail> {
  const clan = await prisma.clan.findUnique({ where: { id: clanId }, select: { ownerId: true } });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);
  if (clan.ownerId !== actorId) {
    throw new ClanError("Apenas o líder pode alterar as configurações.", 403);
  }

  await prisma.clan.update({
    where: { id: clanId },
    data: {
      description: input.description?.trim().slice(0, 500),
      joinMode: input.joinMode,
    },
  });

  return getClanDetail(clanId, actorId);
}

export async function updateClanAvatar(actorId: string, clanId: string, avatarUrl: string): Promise<ClanDetail> {
  const clan = await prisma.clan.findUnique({ where: { id: clanId }, select: { ownerId: true } });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);
  if (clan.ownerId !== actorId) {
    throw new ClanError("Apenas o líder pode alterar a foto do clã.", 403);
  }

  await prisma.clan.update({ where: { id: clanId }, data: { avatarUrl } });
  return getClanDetail(clanId, actorId);
}

async function addMemberToClan(clanId: string, userId: string): Promise<void> {
  const clan = await prisma.clan.findUnique({
    where: { id: clanId },
    select: { id: true, _count: { select: { members: true } } },
  });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);
  if (clan._count.members >= CLAN_MAX_MEMBERS) {
    throw new ClanError("Este clã está cheio.");
  }

  const existingMembership = await getUserClanId(userId);
  if (existingMembership) {
    throw new ClanError("Este jogador já faz parte de um clã.");
  }

  await prisma.clanMember.create({ data: { clanId, userId, role: "MEMBER" } });
}

export async function joinClan(userId: string, clanId: string): Promise<ClanDetail | { pending: true }> {
  const existingMembership = await getUserClanId(userId);
  if (existingMembership) {
    throw new ClanError("Você já faz parte de um clã.");
  }

  const clan = await prisma.clan.findUnique({
    where: { id: clanId },
    select: { id: true, joinMode: true, _count: { select: { members: true } } },
  });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);
  if (clan._count.members >= CLAN_MAX_MEMBERS) {
    throw new ClanError("Este clã está cheio.");
  }

  if (clan.joinMode === "CLOSED") {
    const existing = await prisma.clanJoinRequest.findUnique({
      where: { clanId_userId: { clanId, userId } },
    });
    if (existing?.status === "PENDING") {
      throw new ClanError("Solicitação já enviada. Aguarde aprovação.");
    }
    await prisma.clanJoinRequest.upsert({
      where: { clanId_userId: { clanId, userId } },
      create: { clanId, userId, status: "PENDING" },
      update: { status: "PENDING", message: "" },
    });
    return { pending: true };
  }

  await addMemberToClan(clanId, userId);
  return getClanDetail(clanId, userId);
}

export async function requestJoinClan(
  userId: string,
  clanId: string,
  message?: string,
): Promise<{ pending: true }> {
  const existingMembership = await getUserClanId(userId);
  if (existingMembership) {
    throw new ClanError("Você já faz parte de um clã.");
  }

  const clan = await prisma.clan.findUnique({ where: { id: clanId }, select: { id: true } });
  if (!clan) throw new ClanError("Clã não encontrado.", 404);

  await prisma.clanJoinRequest.upsert({
    where: { clanId_userId: { clanId, userId } },
    create: {
      clanId,
      userId,
      status: "PENDING",
      message: (message ?? "").trim().slice(0, 200),
    },
    update: {
      status: "PENDING",
      message: (message ?? "").trim().slice(0, 200),
    },
  });

  return { pending: true };
}

export async function reviewJoinRequest(
  actorId: string,
  clanId: string,
  requestId: string,
  approve: boolean,
): Promise<ClanDetail> {
  await requireManager(actorId, clanId);

  const request = await prisma.clanJoinRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true } } },
  });
  if (!request || request.clanId !== clanId || request.status !== "PENDING") {
    throw new ClanError("Solicitação não encontrada.", 404);
  }

  if (!approve) {
    await prisma.clanJoinRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });
    return getClanDetail(clanId, actorId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.clanJoinRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
    });

    const memberCount = await tx.clanMember.count({ where: { clanId } });
    if (memberCount >= CLAN_MAX_MEMBERS) {
      throw new ClanError("Clã cheio.", 409);
    }

    const alreadyInClan = await tx.clanMember.findUnique({ where: { userId: request.userId } });
    if (alreadyInClan) {
      throw new ClanError("Jogador já entrou em outro clã.", 409);
    }

    await tx.clanMember.create({
      data: { clanId, userId: request.userId, role: "MEMBER" },
    });
  });

  return getClanDetail(clanId, actorId);
}

export async function inviteMemberByNickname(
  actorId: string,
  clanId: string,
  query: string,
): Promise<ClanDetail> {
  await requireManager(actorId, clanId);

  const trimmed = query.trim();
  if (trimmed.length < 2) throw new ClanError("Informe nickname, nome Steam ou SteamID.", 400);

  const steamId = await resolveSteamId64(trimmed);
  const orFilters: Prisma.UserWhereInput[] = [
    { nickname: { equals: trimmed, mode: "insensitive" } },
    { steamPersonaName: { equals: trimmed, mode: "insensitive" } },
  ];
  if (steamId) orFilters.push({ steamId });

  const target = await prisma.user.findFirst({
    where: { OR: orFilters },
    select: { id: true },
  });
  if (!target) throw new ClanError("Jogador não encontrado.", 404);
  if (target.id === actorId) throw new ClanError("Você já está no clã.", 400);

  await addMemberToClan(clanId, target.id);
  return getClanDetail(clanId, actorId);
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
    include: {
      members: { include: { user: { select: MEMBER_USER_SELECT } } },
      joinRequests: {
        where: { status: "PENDING" },
        include: {
          user: {
            select: SOCIAL_USER_SELECT,
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
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

  const canSeeRequests = viewerRole === "OWNER" || viewerRole === "OFFICER";
  const pendingRequests: ClanJoinRequestView[] = canSeeRequests
    ? clan.joinRequests.map((req) => ({
        id: req.id,
        ...serializeSocialUser(req.user),
        message: req.message,
        createdAt: req.createdAt.toISOString(),
      }))
    : [];

  return {
    id: clan.id,
    tag: clan.tag,
    name: clan.name,
    description: clan.description,
    avatarUrl: clan.avatarUrl,
    joinMode: clan.joinMode,
    ownerId: clan.ownerId,
    createdAt: clan.createdAt.toISOString(),
    stats: computeStats(clan),
    members,
    viewerRole,
    pendingRequests,
  };
}

export async function getUserClanDetail(userId: string): Promise<ClanDetail | null> {
  const clanId = await getUserClanId(userId);
  if (!clanId) return null;
  return getClanDetail(clanId, userId);
}

export async function listClanRanking(limit = 50): Promise<ClanRankingEntry[]> {
  return searchClanRanking({ limit });
}

export async function searchClanRanking(input: {
  q?: string;
  sort?: ClanBrowseSort;
  joinMode?: ClanBrowseJoinMode;
  limit?: number;
}): Promise<ClanRankingEntry[]> {
  const q = input.q?.trim() ?? "";
  const sort = input.sort ?? "points";
  const joinMode = input.joinMode ?? "ALL";
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const clans = await prisma.clan.findMany({
    where: {
      ...(joinMode !== "ALL" ? { joinMode } : {}),
      ...(q
        ? {
            OR: [
              { tag: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { members: { include: { user: { select: MEMBER_USER_SELECT } } } },
  });

  const entries = clans
    .map((clan) => {
      const stats = computeStats(clan);
      return buildRankingEntry(clan, stats, 0);
    })
    .sort((a, b) => {
      switch (sort) {
        case "elo":
          return b.avgElo - a.avgElo || b.totalPoints - a.totalPoints;
        case "members":
          return b.memberCount - a.memberCount || b.totalPoints - a.totalPoints;
        case "wins":
          return b.totalWins - a.totalWins || b.totalPoints - a.totalPoints;
        case "points":
        default:
          return b.totalPoints - a.totalPoints || b.totalXp - a.totalXp;
      }
    })
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return entries;
}
