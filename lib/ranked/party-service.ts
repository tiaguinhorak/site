import "server-only";

import { prisma } from "@/lib/prisma";
import { getAvatarInitials } from "@/lib/profile";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { assertCanJoinRankedParty, PlayStateError } from "@/lib/play-state";
import { RANKED_TEAM_SIZE } from "@/lib/ranked";
import { RANKED_CHALLENGE_TTL_MS } from "@/lib/ranked/constants";
import { eloToLobbyLevel } from "@/lib/lobby/utils";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  notifyParties,
  notifyPartyMembers,
  notifyRankedRooms,
  notifyUser,
} from "@/lib/realtime/notify";
import {
  RANKED_MAP_POOL,
  RANKED_MAP_POOL_MIN,
} from "@/lib/ranked/constants";
import type {
  RankedChallengeView,
  RankedEligibility,
  RankedPartyMemberView,
  RankedPartyView,
  RankedTeamConfigInput,
} from "@/lib/ranked/party-shared";
import { hasRankedSubscription } from "@/lib/ranked";
import { assertNotSmurfBlocked } from "@/lib/anti-smurf/service";
import { logRankedPartyActivity } from "@/lib/ranked/party-activity";
import { assertRankedSmurfEligible } from "@/lib/anti-smurf/service";
import { serializeProfileCustomization } from "@/lib/profile/serialize-customization";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

import { RankedPartyError } from "@/lib/errors/domain";

export { RankedPartyError } from "@/lib/errors/domain";

export const partyInclude = {
  leader: {
    select: {
      id: true,
      ...STEAM_DISPLAY_NAME_SELECT,
      elo: true,
      avatarUrl: true,
      avatarPreset: true,
      steamAvatarUrl: true,
      plan: true,
      steamLinkedAt: true,
      profileBannerUrl: true,
      profileBannerMediaType: true,
      profileBannerModerationStatus: true,
      profileBackgroundId: true,
      profileBackgroundColor: true,
      profileFrameId: true,
      profileFrameColor: true,
      profileAccentColor: true,
      profileThemeId: true,
      profileThemeColor: true,
      profileBorderId: true,
      profileBorderColor: true,
      profileShowPlanBadge: true,
      profileShowAchievements: true,
      avatarMediaType: true,
      avatarModerationStatus: true,
      isAdmin: true,
    },
  },
  members: {
    orderBy: { slotIndex: "asc" as const },
    include: {
      user: {
        select: {
          id: true,
          ...STEAM_DISPLAY_NAME_SELECT,
          elo: true,
          avatarUrl: true,
          avatarPreset: true,
          steamAvatarUrl: true,
          plan: true,
          profileBannerUrl: true,
          profileBannerMediaType: true,
          profileBannerModerationStatus: true,
          profileBackgroundId: true,
          profileBackgroundColor: true,
          profileFrameId: true,
          profileFrameColor: true,
          profileAccentColor: true,
          profileThemeId: true,
          profileThemeColor: true,
          profileBorderId: true,
          profileBorderColor: true,
          profileShowPlanBadge: true,
          profileShowAchievements: true,
          avatarMediaType: true,
          avatarModerationStatus: true,
          isAdmin: true,
        },
      },
    },
  },
};

type PartyWithRelations = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.rankedParty.findFirst<{
        include: typeof partyInclude;
      }>
    >
  >
>;

function serializeMember(
  member: PartyWithRelations["members"][number],
  leaderUserId: string,
  viewerUserId?: string,
): RankedPartyMemberView {
  const isLeaderMember = member.userId === leaderUserId;
  const viewerIsLeader = viewerUserId === leaderUserId;
  return {
    id: member.user.id,
    nickname: member.user.nickname,
    displayName: resolveSteamDisplayName(member.user),
    elo: member.user.elo,
    avatarUrl: resolveUserAvatarUrl(member.user),
    avatarInitials: getAvatarInitials("", "", resolveSteamDisplayName(member.user)),
    customization: serializeProfileCustomization(member.user),
    slotIndex: member.slotIndex,
    isLeader: isLeaderMember,
    isYou: viewerUserId === member.userId,
    canKick: viewerIsLeader && !isLeaderMember,
  };
}

export function parsePartyMapPool(mapPool: unknown): string[] {
  if (!mapPool || !Array.isArray(mapPool)) return [...RANKED_MAP_POOL];
  const valid = mapPool.filter(
    (m): m is (typeof RANKED_MAP_POOL)[number] =>
      typeof m === "string" &&
      (RANKED_MAP_POOL as readonly string[]).includes(m),
  );
  return valid.length >= RANKED_MAP_POOL_MIN ? valid : [...RANKED_MAP_POOL];
}

function normalizeMapPoolInput(maps: string[] | undefined): string[] | undefined {
  if (maps === undefined) return undefined;
  const valid = maps.filter((m) =>
    (RANKED_MAP_POOL as readonly string[]).includes(m),
  );
  const unique = [...new Set(valid)];
  if (unique.length < RANKED_MAP_POOL_MIN) {
    throw new RankedPartyError("mapPoolMin", 400, {
      min: String(RANKED_MAP_POOL_MIN),
    });
  }
  return unique;
}

export function serializeParty(
  party: PartyWithRelations,
  viewerUserId?: string,
  slotsOverride?: number,
): RankedPartyView {
  const slots = slotsOverride ?? RANKED_TEAM_SIZE;
  const members = party.members.map((m) => serializeMember(m, party.leaderUserId, viewerUserId));
  const memberCount = members.length;
  let status = party.status as RankedPartyView["status"];
  if (status === "open" && memberCount >= slots) status = "full";

  const leaderNickname = party.leader.nickname;
  const leaderDisplayName = resolveSteamDisplayName(party.leader);
  const avgElo =
    memberCount > 0
      ? Math.round(members.reduce((sum, m) => sum + m.elo, 0) / memberCount)
      : party.leader.elo;

  return {
    id: party.id,
    name: party.name?.trim() || `Time ${leaderDisplayName}`,
    inviteCode: party.inviteCode,
    status,
    leaderUserId: party.leaderUserId,
    leaderNickname,
    leaderDisplayName,
    memberCount,
    slots,
    avgLevel: eloToLobbyLevel(avgElo),
    region: party.region ?? "BR",
    visibility: (party.visibility as RankedPartyView["visibility"]) ?? "public",
    hasPassword: Boolean(party.passwordHash),
    minLevel: party.minLevel ?? 1,
    maxLevel: party.maxLevel ?? 20,
    mapPool: parsePartyMapPool(party.mapPool),
    isLeader: viewerUserId === party.leaderUserId,
    isMember: viewerUserId ? party.members.some((m) => m.userId === viewerUserId) : false,
    members,
  };
}

const RANKED_NAME_MAX = 32;
const VALID_REGIONS = new Set(["BR", "AR", "UY", "CL", "CO", "PE"]);

function normalizeTeamConfig(input: RankedTeamConfigInput) {
  const data: {
    name?: string | null;
    region?: string;
    visibility?: string;
    minLevel?: number;
    maxLevel?: number;
    mapPool?: string[];
  } = {};

  if (input.name !== undefined) {
    const trimmed = input.name.trim().slice(0, RANKED_NAME_MAX);
    data.name = trimmed.length > 0 ? trimmed : null;
  }
  if (input.region !== undefined) {
    if (!VALID_REGIONS.has(input.region)) {
      throw new RankedPartyError("invalidRegion", 400);
    }
    data.region = input.region;
  }
  if (input.visibility !== undefined) {
    if (input.visibility !== "public" && input.visibility !== "private") {
      throw new RankedPartyError("invalidVisibility", 400);
    }
    data.visibility = input.visibility;
  }
  if (input.minLevel !== undefined) {
    data.minLevel = Math.max(1, Math.min(20, Math.round(input.minLevel)));
  }
  if (input.maxLevel !== undefined) {
    data.maxLevel = Math.max(1, Math.min(20, Math.round(input.maxLevel)));
  }
  if (
    data.minLevel !== undefined &&
    data.maxLevel !== undefined &&
    data.minLevel > data.maxLevel
  ) {
    throw new RankedPartyError("minLevelAboveMax", 400);
  }
  if (input.mapPool !== undefined) {
    data.mapPool = normalizeMapPoolInput(input.mapPool);
  }
  return data;
}

async function assertRankedEligible(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, steamLinkedAt: true },
  });
  if (!user?.steamLinkedAt) {
    throw new RankedPartyError("steamRequired", 403);
  }
  if (!hasRankedSubscription(user.plan.toLowerCase() as "free" | "premium" | "elite")) {
    throw new RankedPartyError("subscriptionRequired", 403);
  }
  await assertRankedSmurfEligible(userId);
}

export async function getPartyForUser(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    include: { party: { include: partyInclude } },
  });
  if (!membership) return null;
  return serializeParty(membership.party, userId);
}

export async function getOrCreatePartyForUser(
  userId: string,
  config?: RankedTeamConfigInput,
) {
  await assertRankedEligible(userId);

  const existing = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    include: { party: { include: partyInclude } },
  });
  if (existing) return serializeParty(existing.party, userId);

  await assertCanJoinRankedParty(userId);

  const normalized = config ? normalizeTeamConfig(config) : {};
  const passwordHash =
    config?.visibility === "private" && config.password
      ? await hashPassword(config.password)
      : null;

  const created = await prisma.$transaction(async (tx) => {
    const party = await tx.rankedParty.create({
      data: {
        leaderUserId: userId,
        status: "open",
        name: normalized.name ?? null,
        region: normalized.region ?? "BR",
        visibility: normalized.visibility ?? "public",
        passwordHash,
        minLevel: normalized.minLevel ?? 1,
        maxLevel: normalized.maxLevel ?? 20,
        mapPool: normalized.mapPool ?? [...RANKED_MAP_POOL],
      },
    });
    await tx.rankedPartyMember.create({
      data: { partyId: party.id, userId, slotIndex: 0 },
    });
    return tx.rankedParty.findUniqueOrThrow({
      where: { id: party.id },
      include: partyInclude,
    });
  });

  await logRankedPartyActivity(
    created.id,
    "created",
    resolveSteamDisplayName(created.leader),
  );

  void notifyPartyMembers(created.id, "party");
  return serializeParty(created, userId);
}

export async function updateParty(userId: string, config: RankedTeamConfigInput) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true, party: { select: { leaderUserId: true, status: true } } },
  });
  if (!membership) throw new RankedPartyError("notInTeam", 400);
  if (membership.party.leaderUserId !== userId) {
    throw new RankedPartyError("leaderOnlyEditTeam", 403);
  }
  if (membership.party.status === "in_match") {
    throw new RankedPartyError("cannotEditDuringMatch", 409);
  }

  const normalized = normalizeTeamConfig(config);
  const data: Record<string, unknown> = { ...normalized };

  if (config.clearPassword) {
    data.passwordHash = null;
  } else if (config.password) {
    data.passwordHash = await hashPassword(config.password);
  }

  // Time privado sem senha definida continua acessível por convite (inviteCode).
  await prisma.rankedParty.update({
    where: { id: membership.partyId },
    data,
  });

  const refreshed = await prisma.rankedParty.findUniqueOrThrow({
    where: { id: membership.partyId },
    include: partyInclude,
  });
  void notifyPartyMembers(membership.partyId, "party");
  return serializeParty(refreshed, userId);
}

export async function disbandParty(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    include: { party: { select: { id: true, leaderUserId: true, status: true } } },
  });
  if (!membership) throw new RankedPartyError("notInTeam", 400);
  if (membership.party.leaderUserId !== userId) {
    throw new RankedPartyError("leaderOnlyDisbandTeam", 403);
  }
  if (membership.party.status === "in_match") {
    throw new RankedPartyError("finishMatchBeforeDisband", 409);
  }

  const { cancelRankedQueueForParty } = await import("@/lib/ranked/queue-service");
  await cancelRankedQueueForParty(membership.party.id);

  await prisma.rankedChallenge.updateMany({
    where: {
      status: "pending",
      OR: [{ fromPartyId: membership.party.id }, { toPartyId: membership.party.id }],
    },
    data: { status: "cancelled", respondedAt: new Date() },
  });

  await prisma.rankedPartyMember.deleteMany({ where: { partyId: membership.party.id } });
  await logRankedPartyActivity(membership.party.id, "disbanded", "Sistema");
  await prisma.rankedParty.update({
    where: { id: membership.party.id },
    data: { status: "disbanded" },
  });

  void notifyRankedRooms("full");
  void notifyUser(userId, "full");
  return { ok: true as const };
}

export async function joinPartyByInviteCode(userId: string, inviteCode: string) {
  await assertRankedEligible(userId);
  await assertCanJoinRankedParty(userId);

  const party = await prisma.rankedParty.findUnique({
    where: { inviteCode },
    include: partyInclude,
  });
  if (!party) throw new RankedPartyError("invalidInviteCode", 404);
  if (party.status === "in_match" || party.status === "disbanded") {
    throw new RankedPartyError("lobbyUnavailable", 400);
  }

  const existingMember = party.members.find((member) => member.userId === userId);
  if (existingMember) return serializeParty(party, userId);

  if (party.members.length >= RANKED_TEAM_SIZE) {
    throw new RankedPartyError("lobbyFull", 409);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "RankedParty" WHERE id = ${party.id} FOR UPDATE`;

      const locked = await tx.rankedParty.findUnique({
        where: { id: party.id },
        include: { members: true },
      });
      if (!locked) throw new RankedPartyError("lobbyNotFound", 404);
      if (locked.members.some((member) => member.userId === userId)) return;

      const spotsLeft = RANKED_TEAM_SIZE - locked.members.length;
      if (spotsLeft <= 0) throw new RankedPartyError("lobbyFull", 409);

      const usedSlots = new Set(locked.members.map((member) => member.slotIndex));
      let slotIndex = 0;
      while (usedSlots.has(slotIndex) && slotIndex < RANKED_TEAM_SIZE) slotIndex += 1;

      await tx.rankedPartyMember.create({
        data: { partyId: party.id, userId, slotIndex },
      });

      const count = locked.members.length + 1;
      await tx.rankedParty.update({
        where: { id: party.id },
        data: { status: count >= RANKED_TEAM_SIZE ? "full" : "open" },
      });
    });
  } catch (err) {
    if (err instanceof RankedPartyError) throw err;
    if (err instanceof PlayStateError) throw err;
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("RankedPartyMember_userId_key")) {
      throw new RankedPartyError("alreadyInOtherRankedLobby", 409);
    }
    throw err;
  }

  const refreshed = await prisma.rankedParty.findUniqueOrThrow({
    where: { id: party.id },
    include: partyInclude,
  });
  const joiner = refreshed.members.find((m) => m.userId === userId);
  if (joiner && !party.members.some((m) => m.userId === userId)) {
    await logRankedPartyActivity(
      party.id,
      "joined",
      resolveSteamDisplayName(joiner.user),
    );
    void notifyPartyMembers(party.id, "party");
  }
  return serializeParty(refreshed, userId);
}

export async function leaveParty(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    include: { party: { include: { members: { orderBy: { joinedAt: "asc" } } } } },
  });
  if (!membership) throw new RankedPartyError("notInLobby", 400);

  const active = await prisma.rankedMatchSession.findFirst({
    where: {
      status: { in: ["accepting", "voting", "starting", "live"] },
      OR: [{ partyAId: membership.partyId }, { partyBId: membership.partyId }],
    },
  });
  if (active) {
    const { abandonRankedSessionInternal } = await import(
      "@/lib/ranked/reconcile-stale-sessions"
    );
    await abandonRankedSessionInternal(
      active.id,
      ["live", "starting"].includes(active.status) ? "finish" : "cancel",
    );
  }

  const { party } = membership;
  const remaining = party.members.filter((m) => m.userId !== userId);
  const { cancelRankedQueueForParty } = await import("@/lib/ranked/queue-service");

  if (remaining.length === 0) {
    await cancelRankedQueueForParty(party.id);
    await prisma.rankedParty.update({
      where: { id: party.id },
      data: { status: "disbanded" },
    });
    await prisma.rankedPartyMember.delete({ where: { id: membership.id } });
    void notifyRankedRooms("full");
    void notifyUser(userId, "full");
    return { ok: true, disbanded: true };
  }

  if (party.leaderUserId === userId) {
    await cancelRankedQueueForParty(party.id);
  }

  const leaver = await prisma.user.findUnique({
    where: { id: userId },
    select: STEAM_DISPLAY_NAME_SELECT,
  });
  await prisma.rankedPartyMember.delete({ where: { id: membership.id } });
  await logRankedPartyActivity(
    party.id,
    "left",
    leaver ? resolveSteamDisplayName(leaver) : "Jogador",
  );

  const updates: { leaderUserId?: string; status: string } = {
    status: remaining.length >= RANKED_TEAM_SIZE ? "full" : "open",
  };
  if (party.leaderUserId === userId) {
    updates.leaderUserId = remaining[0]!.userId;
  }

  await prisma.rankedParty.update({ where: { id: party.id }, data: updates });
  void notifyPartyMembers(party.id, "party");
  void notifyUser(userId, "party");
  return { ok: true, disbanded: false };
}

/** Líder remove um membro do time (kick). */
export async function kickMemberFromParty(leaderUserId: string, targetUserId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId: leaderUserId },
    include: { party: { include: { members: { orderBy: { joinedAt: "asc" } } } } },
  });
  if (!membership) throw new RankedPartyError("notInTeam", 400);
  if (membership.party.leaderUserId !== leaderUserId) {
    throw new RankedPartyError("leaderOnlyKick", 403);
  }
  if (targetUserId === leaderUserId) {
    throw new RankedPartyError("cannotKickSelf", 400);
  }

  const target = membership.party.members.find((m) => m.userId === targetUserId);
  if (!target) throw new RankedPartyError("playerNotInTeam", 404);

  if (membership.party.status === "in_match") {
    throw new RankedPartyError("cannotRemoveDuringMatch", 409);
  }

  const active = await prisma.rankedMatchSession.findFirst({
    where: {
      status: { in: ["accepting", "voting", "starting", "live"] },
      OR: [{ partyAId: membership.partyId }, { partyBId: membership.partyId }],
    },
  });
  if (active) {
    throw new RankedPartyError("finishMatchBeforeRemove", 409);
  }

  const { cancelRankedQueueForParty } = await import("@/lib/ranked/queue-service");
  await cancelRankedQueueForParty(membership.partyId);

  const [targetUser, leader] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId }, select: STEAM_DISPLAY_NAME_SELECT }),
    prisma.user.findUnique({ where: { id: leaderUserId }, select: STEAM_DISPLAY_NAME_SELECT }),
  ]);

  await prisma.rankedPartyMember.delete({ where: { id: target.id } });
  await logRankedPartyActivity(
    membership.partyId,
    "kicked",
    targetUser ? resolveSteamDisplayName(targetUser) : "Jogador",
    leader ? resolveSteamDisplayName(leader) : null,
  );

  const remaining = membership.party.members.filter((m) => m.userId !== targetUserId);
  await prisma.rankedParty.update({
    where: { id: membership.partyId },
    data: {
      status: remaining.length >= RANKED_TEAM_SIZE ? "full" : "open",
    },
  });

  const refreshed = await prisma.rankedParty.findUniqueOrThrow({
    where: { id: membership.partyId },
    include: partyInclude,
  });
  void notifyPartyMembers(membership.partyId, "party");
  void notifyUser(targetUserId, "party");
  return serializeParty(refreshed, leaderUserId);
}

export async function getRankedEligibility(userId: string): Promise<RankedEligibility> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, steamLinkedAt: true },
  });
  const steamLinked = Boolean(user?.steamLinkedAt);
  const hasPlan = hasRankedSubscription(
    (user?.plan.toLowerCase() ?? "free") as "free" | "premium" | "elite",
  );
  return { steamLinked, hasPlan, canPlay: steamLinked && hasPlan };
}

/** Lista todas as salas (times) de ranked ativas para o navegador — sem exigir plano. */
export async function listRankedRooms(viewerUserId: string) {
  const parties = await prisma.rankedParty.findMany({
    where: {
      status: { in: ["open", "full", "in_match"] },
      members: { some: {} },
    },
    include: partyInclude,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 60,
  });

  const rooms = parties.map((p) => serializeParty(p, viewerUserId));

  const stats = {
    available: rooms.filter((r) => r.status === "open").length,
    full: rooms.filter((r) => r.status === "full").length,
    inMatch: rooms.filter((r) => r.status === "in_match").length,
    players: rooms.reduce((sum, r) => sum + r.memberCount, 0),
  };

  const eligibility = await getRankedEligibility(viewerUserId);
  return { rooms, eligibility, stats };
}

/** Entra em uma sala de ranked pública pelo id (mesma lógica do convite). */
export async function joinPartyById(
  userId: string,
  partyId: string,
  password?: string,
) {
  await assertRankedEligible(userId);
  await assertCanJoinRankedParty(userId);

  const party = await prisma.rankedParty.findUnique({
    where: { id: partyId },
    include: partyInclude,
  });
  if (!party) throw new RankedPartyError("roomNotFound", 404);
  if (party.status === "in_match" || party.status === "disbanded") {
    throw new RankedPartyError("roomUnavailable", 400);
  }

  const existingMember = party.members.find((member) => member.userId === userId);
  if (existingMember) return serializeParty(party, userId);

  if (party.visibility === "private") {
    if (!party.passwordHash) {
      throw new RankedPartyError("privateRoomJoinRequired", 403);
    }
    if (!password || !(await verifyPassword(password, party.passwordHash))) {
      throw new RankedPartyError("wrongRoomPassword", 403);
    }
  }

  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { elo: true },
  });
  const viewerLevel = eloToLobbyLevel(viewer?.elo ?? 0);
  if (viewerLevel < party.minLevel || viewerLevel > party.maxLevel) {
    throw new RankedPartyError("levelRequirement", 403, {
      min: String(party.minLevel),
      max: String(party.maxLevel),
      level: String(viewerLevel),
    });
  }

  if (party.members.length >= RANKED_TEAM_SIZE) {
    throw new RankedPartyError("roomFull", 409);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "RankedParty" WHERE id = ${party.id} FOR UPDATE`;

      const locked = await tx.rankedParty.findUnique({
        where: { id: party.id },
        include: { members: true },
      });
      if (!locked) throw new RankedPartyError("roomNotFound", 404);
      if (locked.status === "in_match" || locked.status === "disbanded") {
        throw new RankedPartyError("roomUnavailable", 400);
      }
      if (locked.members.some((member) => member.userId === userId)) return;

      const spotsLeft = RANKED_TEAM_SIZE - locked.members.length;
      if (spotsLeft <= 0) throw new RankedPartyError("roomFull", 409);

      const usedSlots = new Set(locked.members.map((member) => member.slotIndex));
      let slotIndex = 0;
      while (usedSlots.has(slotIndex) && slotIndex < RANKED_TEAM_SIZE) slotIndex += 1;

      await tx.rankedPartyMember.create({
        data: { partyId: party.id, userId, slotIndex },
      });

      const count = locked.members.length + 1;
      await tx.rankedParty.update({
        where: { id: party.id },
        data: { status: count >= RANKED_TEAM_SIZE ? "full" : "open" },
      });
    });
  } catch (err) {
    if (err instanceof RankedPartyError) throw err;
    if (err instanceof PlayStateError) throw err;
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("RankedPartyMember_userId_key")) {
      throw new RankedPartyError("alreadyInOtherRankedLobby", 409);
    }
    throw err;
  }

  const refreshed = await prisma.rankedParty.findUniqueOrThrow({
    where: { id: party.id },
    include: partyInclude,
  });
  const joiner = refreshed.members.find((m) => m.userId === userId);
  if (joiner && !party.members.some((m) => m.userId === userId)) {
    await logRankedPartyActivity(
      party.id,
      "joined",
      resolveSteamDisplayName(joiner.user),
    );
    void notifyPartyMembers(party.id, "party");
  }
  return serializeParty(refreshed, userId);
}

export async function listChallengeableParties(viewerUserId: string) {
  const viewerParty = await prisma.rankedPartyMember.findUnique({
    where: { userId: viewerUserId },
    select: { partyId: true },
  });

  const parties = await prisma.rankedParty.findMany({
    where: {
      status: { in: ["full", "open"] },
      members: { some: {} },
      NOT: viewerParty ? { id: viewerParty.partyId } : undefined,
    },
    include: partyInclude,
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return parties
    .filter((p) => p.members.length >= RANKED_TEAM_SIZE)
    .map((p) => serializeParty(p, viewerUserId));
}

export async function listPartyChallenges(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true, party: { select: { leaderUserId: true } } },
  });
  if (!membership) return { incoming: [] as RankedChallengeView[], outgoing: [] as RankedChallengeView[] };

  const now = new Date();
  await prisma.rankedChallenge.updateMany({
    where: { status: "pending", expiresAt: { lt: now } },
    data: { status: "expired" },
  });

  const challenges = await prisma.rankedChallenge.findMany({
    where: {
      status: "pending",
      OR: [{ fromPartyId: membership.partyId }, { toPartyId: membership.partyId }],
    },
    include: {
      fromParty: { include: { leader: { select: { nickname: true } } } },
      toParty: { include: { leader: { select: { nickname: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapChallenge = (c: (typeof challenges)[number]): RankedChallengeView => ({
    id: c.id,
    fromPartyId: c.fromPartyId,
    toPartyId: c.toPartyId,
    status: c.status as RankedChallengeView["status"],
    expiresAt: c.expiresAt.toISOString(),
    fromLeaderNickname: c.fromParty.leader.nickname,
    toLeaderNickname: c.toParty.leader.nickname,
    isIncoming: c.toPartyId === membership.partyId,
    isOutgoing: c.fromPartyId === membership.partyId,
  });

  return {
    incoming: challenges
      .filter((c) => c.toPartyId === membership.partyId)
      .map(mapChallenge),
    outgoing: challenges
      .filter((c) => c.fromPartyId === membership.partyId)
      .map(mapChallenge),
  };
}

export async function sendChallenge(fromUserId: string, toPartyId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId: fromUserId },
    include: { party: { include: { members: true } } },
  });
  if (!membership) {
    throw new RankedPartyError("needFivePlayerLobby", 400);
  }
  if (membership.party.leaderUserId !== fromUserId) {
    throw new RankedPartyError("leaderOnlyChallenge", 403);
  }
  if (membership.party.members.length < RANKED_TEAM_SIZE) {
    throw new RankedPartyError("lobbyNeedsPlayers", 400, {
      count: String(RANKED_TEAM_SIZE),
    });
  }
  if (membership.party.status === "in_match") {
    throw new RankedPartyError("lobbyInMatch", 409);
  }

  const queueEntry = await prisma.rankedQueueEntry.findUnique({
    where: { partyId: membership.partyId },
  });
  if (queueEntry?.status === "searching") {
    throw new RankedPartyError("cancelQueueBeforeChallenge", 409);
  }

  if (toPartyId === membership.partyId) {
    throw new RankedPartyError("cannotChallengeSelf", 400);
  }

  const target = await prisma.rankedParty.findUnique({
    where: { id: toPartyId },
    include: { members: true },
  });
  if (!target || target.members.length < RANKED_TEAM_SIZE) {
    throw new RankedPartyError("targetLobbyUnavailable", 404);
  }
  if (target.status === "in_match") {
    throw new RankedPartyError("targetLobbyInMatch", 409);
  }

  const pending = await prisma.rankedChallenge.findFirst({
    where: {
      status: "pending",
      OR: [
        { fromPartyId: membership.partyId, toPartyId },
        { fromPartyId: toPartyId, toPartyId: membership.partyId },
      ],
    },
  });
  if (pending) {
    throw new RankedPartyError("pendingChallengeExists", 409);
  }

  const challenge = await prisma.rankedChallenge.create({
    data: {
      fromPartyId: membership.partyId,
      toPartyId,
      expiresAt: new Date(Date.now() + RANKED_CHALLENGE_TTL_MS),
    },
    include: {
      fromParty: { include: { leader: { select: { nickname: true } } } },
      toParty: { include: { leader: { select: { nickname: true } } } },
    },
  });

  void notifyParties([membership.partyId, toPartyId], "party");

  return {
    id: challenge.id,
    fromPartyId: challenge.fromPartyId,
    toPartyId: challenge.toPartyId,
    status: "pending" as const,
    expiresAt: challenge.expiresAt.toISOString(),
    fromLeaderNickname: challenge.fromParty.leader.nickname,
    toLeaderNickname: challenge.toParty.leader.nickname,
    isIncoming: false,
    isOutgoing: true,
  } satisfies RankedChallengeView;
}

export async function respondToChallenge(
  userId: string,
  challengeId: string,
  accept: boolean,
) {
  const challenge = await prisma.rankedChallenge.findUnique({
    where: { id: challengeId },
    include: {
      toParty: { select: { leaderUserId: true, id: true } },
      fromParty: { select: { id: true } },
    },
  });
  if (!challenge) throw new RankedPartyError("challengeNotFound", 404);
  if (challenge.status !== "pending") {
    throw new RankedPartyError("challengeNotPending", 400);
  }
  if (challenge.expiresAt < new Date()) {
    await prisma.rankedChallenge.update({
      where: { id: challengeId },
      data: { status: "expired" },
    });
    throw new RankedPartyError("challengeExpired", 410);
  }
  if (challenge.toParty.leaderUserId !== userId) {
    throw new RankedPartyError("leaderOnlyRespondChallenge", 403);
  }

  if (!accept) {
    await prisma.rankedChallenge.update({
      where: { id: challengeId },
      data: { status: "declined", respondedAt: new Date() },
    });
    void notifyParties([challenge.fromPartyId, challenge.toPartyId], "party");
    return { accepted: false };
  }

  const { createMatchSessionFromChallenge } = await import("@/lib/ranked/match-session-service");

  await prisma.$transaction(async (tx) => {
    await tx.rankedChallenge.update({
      where: { id: challengeId },
      data: { status: "accepted", respondedAt: new Date() },
    });
    await tx.rankedParty.updateMany({
      where: { id: { in: [challenge.fromPartyId, challenge.toPartyId] } },
      data: { status: "in_match" },
    });
  });

  const session = await createMatchSessionFromChallenge(challengeId);
  return { accepted: true, session };
}
