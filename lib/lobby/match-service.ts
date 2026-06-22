import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { ensureSystemLobbyRooms } from "@/lib/lobby/provision-system-rooms";
import { LobbyRoomError } from "@/lib/lobby/rooms-service";
import { markPartiesInMatch } from "@/lib/ranked/party-lifecycle";
import { RANKED_VOTE_SECONDS } from "@/lib/ranked/constants";
import { notifyRankedVoteStarted } from "@/lib/ranked/notifications";
import { partyInclude } from "@/lib/ranked/party-service";
import { serializeSession } from "@/lib/ranked/match-session-service";

export const LOBBY_2X2_TEAM_SIZE = 2;
export const LOBBY_2X2_SLOTS = 4;
const BOT_EMAIL_DOMAIN = "test.clutchclube.com";

async function ensureBotUser(index: number): Promise<string> {
  const email = `lobby-bot-${index}@${BOT_EMAIL_DOMAIN}`;
  const steamId = `765611979602879${(50 + index).toString().padStart(2, "0")}`;
  const passwordHash = await hashPassword("Test1234!");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        plan: "PREMIUM",
        steamLinkedAt: new Date(),
        steamId,
        steamPersonaName: `Bot ${index}`,
      },
    });
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      nickname: `BOT${index}`,
      plan: "PREMIUM",
      steamId,
      steamLinkedAt: new Date(),
      steamPersonaName: `Bot ${index}`,
    },
  });
  return created.id;
}

/** Admin: cria sala 2x2 visível no lobby (Wingman). */
export async function createAdmin2x2TestRoom(adminUserId: string, name?: string) {
  const wingman = await prisma.gameMode.findFirst({
    where: { slug: "wingman" },
    include: { rooms: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!wingman) {
    throw new LobbyRoomError("wingmanModeNotFound", 500);
  }

  const nextOrder = (wingman.rooms[0]?.sortOrder ?? 0) + 1;
  const roomName = name?.trim() || `2x2 Teste #${nextOrder}`;

  const catalog = await prisma.gameModeRoom.create({
    data: {
      gameModeId: wingman.id,
      name: roomName,
      map: "de_inferno",
      players: 0,
      slots: LOBBY_2X2_SLOTS,
      ping: 12,
      sortOrder: nextOrder,
    },
  });

  await ensureSystemLobbyRooms();

  const lobbyRoom = await prisma.lobbyRoom.findFirst({
    where: { catalogRoomId: catalog.id },
    include: { gameMode: true, members: { include: { user: true } } },
  });

  if (!lobbyRoom) {
    throw new LobbyRoomError("provisionFailed", 500);
  }

  return lobbyRoom;
}

type StartLobbyMatchOptions = {
  fillBots?: boolean;
  actorUserId: string;
  isAdmin?: boolean;
};

async function createEphemeralPartyTx(
  tx: Prisma.TransactionClient,
  leaderUserId: string,
  memberUserIds: string[],
  teamSize: number,
) {
  const party = await tx.rankedParty.create({
    data: {
      leaderUserId,
      status: memberUserIds.length >= teamSize ? "full" : "open",
    },
  });

  await tx.rankedPartyMember.createMany({
    data: memberUserIds.map((userId, slotIndex) => ({
      partyId: party.id,
      userId,
      slotIndex,
    })),
  });

  return party.id;
}

/**
 * Inicia partida 2x2 a partir de uma sala do lobby: votação de mapa + connect (reusa ranked).
 * Remove membros do lobby e coloca em parties temporárias para o fluxo de match.
 */
export async function startLobbyRoomMatch(
  lobbyRoomId: string,
  options: StartLobbyMatchOptions,
) {
  const room = await prisma.lobbyRoom.findUnique({
    where: { id: lobbyRoomId },
    include: {
      members: { orderBy: { slotIndex: "asc" }, include: { user: true } },
      rankedMatch: true,
    },
  });

  if (!room) throw new LobbyRoomError("roomNotFound", 404);
  if (room.slots !== LOBBY_2X2_SLOTS) {
    throw new LobbyRoomError("notWingman2x2", 400);
  }
  if (room.status === "in_match") {
    throw new LobbyRoomError("matchInProgress", 409);
  }

  const isHost = room.hostUserId === options.actorUserId;
  if (!isHost && !options.isAdmin) {
    throw new LobbyRoomError("hostOrAdminOnlyStart", 403);
  }

  let playerIds = room.members.map((m) => m.userId);
  const minPlayers = options.fillBots ? 2 : LOBBY_2X2_SLOTS;

  if (playerIds.length < minPlayers) {
    throw options.fillBots
      ? new LobbyRoomError("minPlayersWithBots", 400)
      : new LobbyRoomError("needFourPlayers", 400);
  }

  const botsNeeded = LOBBY_2X2_SLOTS - playerIds.length;
  if (botsNeeded > 0) {
    if (!options.fillBots) {
      throw new LobbyRoomError("roomIncomplete", 400);
    }
    for (let i = 0; i < botsNeeded; i++) {
      playerIds.push(await ensureBotUser(i + 1));
    }
  }

  playerIds = playerIds.slice(0, LOBBY_2X2_SLOTS);
  const teamAIds = playerIds.slice(0, LOBBY_2X2_TEAM_SIZE);
  const teamBIds = playerIds.slice(LOBBY_2X2_TEAM_SIZE, LOBBY_2X2_SLOTS);

  const sessionInclude = {
    partyA: { include: partyInclude },
    partyB: { include: partyInclude },
    acceptances: { include: { user: { select: { id: true, nickname: true } } } },
    mapVotes: true,
    challenge: true,
  };

  const session = await prisma.$transaction(async (tx) => {
    const realMemberIds = room.members.map((m) => m.userId);
    await tx.lobbyMember.deleteMany({ where: { lobbyRoomId, userId: { in: realMemberIds } } });

    for (const userId of realMemberIds) {
      await tx.rankedPartyMember.deleteMany({ where: { userId } });
    }

    const partyAId = await createEphemeralPartyTx(tx, teamAIds[0]!, teamAIds, LOBBY_2X2_TEAM_SIZE);
    const partyBId = await createEphemeralPartyTx(tx, teamBIds[0]!, teamBIds, LOBBY_2X2_TEAM_SIZE);

    const created = await tx.rankedMatchSession.create({
      data: {
        partyAId,
        partyBId,
        lobbyRoomId,
        matchSource: "lobby",
        teamSize: LOBBY_2X2_TEAM_SIZE,
        status: "voting",
        voteEndsAt: new Date(Date.now() + RANKED_VOTE_SECONDS * 1000),
      },
    });

    await tx.rankedMatchAcceptance.createMany({
      data: playerIds.map((userId) => ({
        sessionId: created.id,
        userId,
        accepted: true,
        acceptedAt: new Date(),
      })),
    });

    await tx.lobbyRoom.update({
      where: { id: lobbyRoomId },
      data: { status: "in_match", matchId: created.id },
    });

    return tx.rankedMatchSession.findUniqueOrThrow({
      where: { id: created.id },
      include: sessionInclude,
    });
  });

  await markPartiesInMatch(session.partyAId, session.partyBId);
  await notifyRankedVoteStarted(playerIds);

  return serializeSession(session, options.actorUserId);
}

export async function getLobbyRoomMatchSummary(lobbyRoomId: string) {
  const session = await prisma.rankedMatchSession.findFirst({
    where: {
      lobbyRoomId,
      status: { in: ["accepting", "voting", "starting", "live", "finished"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      selectedMap: true,
      serverHost: true,
      serverPort: true,
      teamSize: true,
    },
  });
  return session;
}
