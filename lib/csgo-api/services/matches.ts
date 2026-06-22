import { prisma } from "@/lib/prisma";
import { CsgoApiError, assertFound } from "@/lib/csgo-api/http";
import { serializeMatch } from "@/lib/csgo-api/serializers";
import {
  DEFAULT_MAP_POOL,
  type MatchConfig,
  type PickedMaps,
  type VetoHistoryEntry,
  type createMatchSchema,
  type matchStartSchema,
  type vetoActionSchema,
} from "@/lib/csgo-api/schemas";
import { applyVetoAction, buildVetoState } from "@/lib/csgo-api/veto";
import type { z } from "zod";
import {
  markServerBusy,
  pickAvailableServer,
  releaseServer,
  startServer,
} from "@/lib/csgo-api/services/servers";
import { sendRconCommand } from "@/lib/csgo-api/rcon";
import type { MatchTeam } from "@/lib/csgo-api/schemas";

type CreateMatchInput = z.infer<typeof createMatchSchema>;
type VetoInput = z.infer<typeof vetoActionSchema>;
type StartInput = z.infer<typeof matchStartSchema>;

const DEFAULT_CONFIG: MatchConfig = {
  gameType: 0,
  gameMode: 1,
  tickrate: 128,
  maxRounds: 30,
  overtimeRounds: 6,
};

export async function listMatches(status?: string) {
  const matches = await prisma.csgoMatch.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return matches.map(serializeMatch);
}

export async function getMatch(id: string) {
  const match = await prisma.csgoMatch.findUnique({ where: { id } });
  return serializeMatch(assertFound(match, "Partida"));
}

export async function createMatch(input: CreateMatchInput) {
  const match = await prisma.csgoMatch.create({
    data: {
      roomId: input.roomId,
      teamA: input.teamA,
      teamB: input.teamB,
      mapPool: input.mapPool ?? [...DEFAULT_MAP_POOL],
      config: input.config ?? DEFAULT_CONFIG,
      status: "waiting_players",
    },
  });
  return serializeMatch(match);
}

export async function startVeto(id: string) {
  const match = assertFound(await prisma.csgoMatch.findUnique({ where: { id } }), "Partida");
  if (match.status !== "waiting_players" && match.status !== "ready") {
    throw new CsgoApiError(`Partida em status "${match.status}" não pode iniciar veto.`);
  }

  const updated = await prisma.csgoMatch.update({
    where: { id },
    data: {
      status: "veto",
      vetoHistory: [],
      pickedMaps: {},
      selectedMap: null,
    },
  });
  return serializeMatch(updated);
}

export async function getVetoState(id: string) {
  const match = assertFound(await prisma.csgoMatch.findUnique({ where: { id } }), "Partida");
  const mapPool = match.mapPool as string[];
  const history = match.vetoHistory as VetoHistoryEntry[];
  const pickedMaps = match.pickedMaps as PickedMaps;
  return buildVetoState(mapPool, history, pickedMaps);
}

export async function processVeto(id: string, input: VetoInput) {
  const match = assertFound(await prisma.csgoMatch.findUnique({ where: { id } }), "Partida");
  if (match.status !== "veto") {
    throw new CsgoApiError("Partida não está em fase de veto.");
  }

  const mapPool = match.mapPool as string[];
  const history = match.vetoHistory as VetoHistoryEntry[];
  const pickedMaps = match.pickedMaps as PickedMaps;

  const { history: newHistory, pickedMaps: newPicked, vetoState } = applyVetoAction(
    mapPool,
    history,
    pickedMaps,
    input,
  );

  const updated = await prisma.csgoMatch.update({
    where: { id },
    data: {
      vetoHistory: newHistory,
      pickedMaps: newPicked,
      selectedMap: vetoState.isComplete ? (vetoState.selectedMap ?? null) : match.selectedMap,
      status: vetoState.isComplete ? "ready" : "veto",
    },
  });

  return {
    match: serializeMatch(updated),
    vetoState,
  };
}

async function configureMatchOnServer(
  serverId: string,
  match: {
    teamA: MatchTeam;
    teamB: MatchTeam;
    selectedMap: string;
    config: MatchConfig;
  },
) {
  const server = assertFound(
    await prisma.csgoServer.findUnique({ where: { id: serverId } }),
    "Servidor",
  );

  const cmds = [
    "mp_autoteambalance 0",
    "mp_limitteams 0",
    `mp_roundtime ${1.75}`,
    `mp_maxrounds ${match.config.maxRounds}`,
    `mp_overtime_maxrounds ${match.config.overtimeRounds}`,
    `hostname "${match.teamA.name} vs ${match.teamB.name}"`,
    `mp_teamname_1 "${match.teamA.name}"`,
    `mp_teamname_2 "${match.teamB.name}"`,
    "mp_warmup_start",
    `changelevel ${match.selectedMap}`,
  ];

  for (const cmd of cmds) {
    await sendRconCommand(server, cmd);
  }

  setTimeout(() => {
    void sendRconCommand(server, "mp_warmup_end").catch(() => undefined);
  }, 15_000);
}

export async function startMatch(id: string, input: StartInput = {}) {
  const match = assertFound(await prisma.csgoMatch.findUnique({ where: { id } }), "Partida");

  if (match.status !== "ready" && match.status !== "veto") {
    throw new CsgoApiError(`Partida em status "${match.status}" não pode ser iniciada.`);
  }

  let selectedMap = match.selectedMap;
  if (!selectedMap) {
    const veto = buildVetoState(
      match.mapPool as string[],
      match.vetoHistory as VetoHistoryEntry[],
      match.pickedMaps as PickedMaps,
    );
    selectedMap = veto.selectedMap ?? null;
  }
  if (!selectedMap) {
    throw new CsgoApiError("Mapa não selecionado. Conclua o veto primeiro.");
  }

  let server = await pickAvailableServer(input.serverId);
  if (server.status === "offline") {
    await startServer(server.id, { map: selectedMap });
    server = assertFound(
      await prisma.csgoServer.findUnique({ where: { id: server.id } }),
      "Servidor",
    );
  }

  await markServerBusy(server.id);

  const teamA = match.teamA as MatchTeam;
  const teamB = match.teamB as MatchTeam;
  const config = match.config as MatchConfig;

  try {
    await configureMatchOnServer(server.id, {
      teamA,
      teamB,
      selectedMap,
      config,
    });
  } catch (err) {
    await releaseServer(server.id);
    throw err;
  }

  const updated = await prisma.csgoMatch.update({
    where: { id },
    data: {
      status: "live",
      serverId: server.id,
      selectedMap,
    },
  });

  return serializeMatch(updated);
}

export async function pauseMatch(id: string) {
  const match = assertFound(await prisma.csgoMatch.findUnique({ where: { id } }), "Partida");
  if (!match.serverId) throw new CsgoApiError("Partida sem servidor ativo.");
  const server = assertFound(
    await prisma.csgoServer.findUnique({ where: { id: match.serverId } }),
    "Servidor",
  );
  await sendRconCommand(server, "mp_pause_match");
  return serializeMatch(match);
}

export async function unpauseMatch(id: string) {
  const match = assertFound(await prisma.csgoMatch.findUnique({ where: { id } }), "Partida");
  if (!match.serverId) throw new CsgoApiError("Partida sem servidor ativo.");
  const server = assertFound(
    await prisma.csgoServer.findUnique({ where: { id: match.serverId } }),
    "Servidor",
  );
  await sendRconCommand(server, "mp_unpause_match");
  return serializeMatch(match);
}

export async function endMatch(id: string) {
  const match = assertFound(await prisma.csgoMatch.findUnique({ where: { id } }), "Partida");
  if (match.serverId) {
    const server = await prisma.csgoServer.findUnique({ where: { id: match.serverId } });
    if (server) {
      await sendRconCommand(server, "mp_match_end").catch(() => undefined);
      await releaseServer(server.id);
    }
  }
  const updated = await prisma.csgoMatch.update({
    where: { id },
    data: { status: "finished" },
  });
  return serializeMatch(updated);
}

export async function cancelMatch(id: string) {
  const match = assertFound(await prisma.csgoMatch.findUnique({ where: { id } }), "Partida");
  if (match.serverId) {
    await releaseServer(match.serverId);
  }
  const updated = await prisma.csgoMatch.update({
    where: { id },
    data: { status: "cancelled" },
  });
  return serializeMatch(updated);
}
