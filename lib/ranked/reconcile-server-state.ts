import "server-only";

import { prisma } from "@/lib/prisma";
import { queryCsgoServerLive } from "@/lib/csgo-api/query-live-server";

/** Limpa connect de sessões ranked quando o servidor cai ou é removido da infra. */
export async function clearRankedSessionsForEndpoint(
  host: string,
  port: number,
): Promise<number> {
  const result = await prisma.rankedMatchSession.updateMany({
    where: {
      serverHost: host,
      serverPort: port,
      status: { in: ["live", "starting"] },
    },
    data: {
      status: "starting",
      serverHost: null,
      serverPort: null,
    },
  });
  return result.count;
}

/** Limpa connect de todas as sessões ativas (ex.: servidor removido da API). */
export async function clearAllRankedSessionConnects(): Promise<number> {
  const result = await prisma.rankedMatchSession.updateMany({
    where: {
      status: { in: ["live", "starting"] },
      OR: [{ serverHost: { not: null } }, { serverPort: { not: null } }],
    },
    data: {
      status: "starting",
      serverHost: null,
      serverPort: null,
    },
  });
  return result.count;
}

/**
 * Se a sessão está live mas o servidor UDP não responde, volta para starting sem connect.
 */
export async function reconcileRankedSessionConnect(sessionId: string): Promise<boolean> {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    select: { status: true, serverHost: true, serverPort: true },
  });
  if (!session?.serverHost || !session.serverPort) return false;
  if (session.status !== "live" && session.status !== "starting") return false;

  const live = await queryCsgoServerLive(session.serverHost, session.serverPort);
  if (live.online) return false;

  await prisma.rankedMatchSession.updateMany({
    where: {
      id: sessionId,
      status: { in: ["live", "starting"] },
    },
    data: {
      status: "starting",
      serverHost: null,
      serverPort: null,
    },
  });
  return true;
}
