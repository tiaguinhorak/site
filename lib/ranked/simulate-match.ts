import "server-only";

import { prisma } from "@/lib/prisma";
import { cancelStaleCsgoMatches } from "@/lib/csgo-api/cancel-stale-matches";
import { ensureDefaultCsgoServerRegistered } from "@/lib/csgo-api/bootstrap-default-server";
import { startCsgoServer } from "@/lib/csgo-api/server-control";
import { hashPassword } from "@/lib/auth/password";
import { RANKED_TEAM_SIZE } from "@/lib/ranked";
import { RANKED_MAP_POOL } from "@/lib/ranked/constants";
import {
  acceptMatchSession,
  castMapVote,
  getMapVoteStateForUser,
} from "@/lib/ranked/match-session-service";
import {
  getOrCreatePartyForUser,
  joinPartyByInviteCode,
  RankedPartyError,
  respondToChallenge,
  sendChallenge,
} from "@/lib/ranked/party-service";
import type { RankedMatchSessionView } from "@/lib/ranked/party-shared";
import { formatConnectAddress, formatConnectCommand } from "@/lib/servers/connect";

const BOT_EMAIL_DOMAIN = "test.clutchclube.com";
const BOT_COUNT = RANKED_TEAM_SIZE * 2 - 1;
const SIMULATE_VOTE_MAP = RANKED_MAP_POOL[0]!;
const SERVER_POLL_ATTEMPTS = 6;
const SERVER_POLL_MS = 2_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type RankedSimulateResult = {
  ok: boolean;
  message: string;
  steps: string[];
  session?: RankedMatchSessionView;
  connectAddress?: string | null;
  connectCommand?: string | null;
  warning?: string;
};

async function cleanupRankedState() {
  await prisma.rankedMapVote.deleteMany();
  await prisma.rankedQueueEntry.deleteMany();
  await prisma.rankedMatchAcceptance.deleteMany();
  await prisma.rankedMatchSession.deleteMany();
  await prisma.rankedChallenge.deleteMany();
  await prisma.rankedPartyMember.deleteMany();
  await prisma.rankedParty.deleteMany();
}

async function prepareAdminUser(adminUserId: string) {
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: adminUserId } });
  await prisma.user.update({
    where: { id: adminUserId },
    data: {
      plan: "PREMIUM",
      steamLinkedAt: admin.steamLinkedAt ?? new Date(),
      steamId: admin.steamId ?? "76561198000000001",
      steamPersonaName: admin.steamPersonaName ?? admin.nickname,
    },
  });
}

async function ensureBotUser(index: number): Promise<string> {
  const email = `ranked-bot-${index}@${BOT_EMAIL_DOMAIN}`;
  const steamId = `765611979602879${(30 + index).toString().padStart(2, "0")}`;
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

export async function simulateRankedMatchForAdmin(adminUserId: string): Promise<RankedSimulateResult> {
  const steps: string[] = [];

  try {
    const cancelledApi = await cancelStaleCsgoMatches();
    if (cancelledApi > 0) {
      steps.push(`${cancelledApi} partida(s) antiga(s) cancelada(s) na API CS:GO.`);
    }

    const bootstrap = await ensureDefaultCsgoServerRegistered();
    if (bootstrap.ok) {
      steps.push(bootstrap.message);
      if (bootstrap.registered && bootstrap.server) {
        const started = await startCsgoServer(bootstrap.server.id, SIMULATE_VOTE_MAP);
        steps.push(started.ok ? started.message : `Subir servidor: ${started.message}`);
      }
    } else {
      steps.push(bootstrap.message);
    }

    await cleanupRankedState();
    steps.push("Estado ranked anterior limpo.");

    await prepareAdminUser(adminUserId);
    steps.push("Conta admin preparada (Premium + Steam).");

    const botIds: string[] = [];
    for (let i = 1; i <= BOT_COUNT; i++) {
      botIds.push(await ensureBotUser(i));
    }
    steps.push(`${BOT_COUNT} bots de teste prontos.`);

    const partyA = await getOrCreatePartyForUser(adminUserId);
    for (let i = 0; i < RANKED_TEAM_SIZE - 1; i++) {
      await joinPartyByInviteCode(botIds[i]!, partyA.inviteCode);
    }
    steps.push(`Party A completa (${RANKED_TEAM_SIZE}/5) — você é o líder.`);

    const partyBLeaderId = botIds[RANKED_TEAM_SIZE - 1]!;
    const partyB = await getOrCreatePartyForUser(partyBLeaderId);
    for (let i = RANKED_TEAM_SIZE; i < BOT_COUNT; i++) {
      await joinPartyByInviteCode(botIds[i]!, partyB.inviteCode);
    }
    steps.push(`Party B completa (${RANKED_TEAM_SIZE}/5).`);

    const challenge = await sendChallenge(adminUserId, partyB.id);
    steps.push("Desafio enviado.");

    const accepted = await respondToChallenge(partyBLeaderId, challenge.id, true);
    if (!accepted.accepted || !accepted.session) {
      return { ok: false, message: "Falha ao aceitar desafio.", steps };
    }

    const sessionId = accepted.session.id;
    steps.push("Desafio aceito — sessão de partida criada.");

    const allPlayerIds = [adminUserId, ...botIds.slice(0, RANKED_TEAM_SIZE - 1), partyBLeaderId, ...botIds.slice(RANKED_TEAM_SIZE)];
    for (const userId of allPlayerIds) {
      await acceptMatchSession(userId, sessionId);
    }
    steps.push("10/10 jogadores confirmaram.");

    await castMapVote(adminUserId, sessionId, SIMULATE_VOTE_MAP);
    steps.push(`Voto registrado (${SIMULATE_VOTE_MAP}) — bots votam automaticamente.`);

    let voteResult = await getMapVoteStateForUser(adminUserId, sessionId);
    for (let attempt = 0; attempt < SERVER_POLL_ATTEMPTS; attempt++) {
      if (voteResult.session.status === "live" && voteResult.session.serverHost) break;
      await sleep(SERVER_POLL_MS);
      voteResult = await getMapVoteStateForUser(adminUserId, sessionId);
    }

    if (voteResult.session.status === "voting") {
      steps.push("Votação ainda em andamento — abra /dashboard/ranked para votar.");
    } else if (voteResult.session.status === "starting") {
      steps.push(
        voteResult.launchMessage ??
          "Mapa definido — aguardando servidor (registre em Admin → Infra CS:GO).",
      );
    } else if (voteResult.session.status === "live") {
      steps.push("Servidor live — connect disponível.");
    }

    const session = voteResult.session;
    if (!session) {
      return {
        ok: false,
        message: "Simulação terminou sem sessão ativa para o admin.",
        steps,
      };
    }

    const connectAddress = formatConnectAddress(session.serverHost, session.serverPort);
    const connectCommand = formatConnectCommand(session.serverHost, session.serverPort);

    let warning: string | undefined;
    const serverBlocked = !bootstrap.ok;

    if (session.status === "starting" && !connectAddress) {
      warning =
        voteResult.launchMessage ??
        "Partida criada, mas o servidor ainda não está disponível. Registre e suba o servidor em Admin → Infra CS:GO.";
    } else if (session.status !== "live") {
      warning = "Partida criada, mas o servidor pode ainda estar subindo. Atualize /dashboard/ranked.";
    } else if (!connectAddress) {
      warning = "Partida live, mas connect ainda não disponível. Aguarde e atualize a página ranked.";
    }

    const success = session.status === "live" && Boolean(connectAddress);

    return {
      ok: success,
      message: success
        ? `Partida live! Connect: ${connectCommand}`
        : serverBlocked
          ? bootstrap.message
          : warning ?? "Partida criada, mas o connect ainda não está disponível. Veja os passos abaixo.",
      steps,
      session,
      connectAddress,
      connectCommand,
      warning: success ? undefined : warning,
    };
  } catch (err) {
    const message =
      err instanceof RankedPartyError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Erro na simulação ranked.";
    steps.push(`Erro: ${message}`);
    return { ok: false, message, steps };
  }
}
