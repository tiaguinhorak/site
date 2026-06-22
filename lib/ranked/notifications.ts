import "server-only";

import { prisma } from "@/lib/prisma";
import { formatConnectCommand } from "@/lib/servers/connect";
import { formatMapLabel } from "@/lib/servers/maps";
import type { NotificationType } from "@/lib/generated/prisma/client";

type NotifyOptions = {
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string>;
  fallbackTitle: string;
  fallbackBody: string;
  type?: NotificationType;
};

export async function notifyRankedUsers(userIds: string[], options: NotifyOptions) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return;

  const prefs = await prisma.userNotificationPreferences.findMany({
    where: { userId: { in: unique } },
  });
  const prefMap = new Map(prefs.map((p) => [p.userId, p]));

  const allowed = unique.filter((userId) => {
    const pref = prefMap.get(userId);
    if (!pref) return true;
    return pref.inAppMatch;
  });

  if (!allowed.length) return;

  await prisma.notification.createMany({
    data: allowed.map((userId) => ({
      userId,
      title: options.fallbackTitle,
      body: options.fallbackBody,
      titleKey: options.titleKey,
      bodyKey: options.bodyKey,
      params: options.params ?? {},
      type: options.type ?? "MATCH",
    })),
  });
}

export async function notifyRankedMatchReady(userIds: string[]) {
  await notifyRankedUsers(userIds, {
    titleKey: "match.ready.title",
    bodyKey: "match.ready.body",
    params: { action: "ranked" },
    fallbackTitle: "Partida rankeada encontrada",
    fallbackBody:
      "Confirme que está pronto no lobby rankeado antes da votação de mapas.",
  });
}

export async function notifyRankedVoteStarted(userIds: string[]) {
  await notifyRankedUsers(userIds, {
    titleKey: "match.voteStarted.title",
    bodyKey: "match.voteStarted.body",
    params: { action: "ranked" },
    fallbackTitle: "Votação de mapas",
    fallbackBody: "A partida foi formada! Vote no seu mapa no modal da rankeada.",
  });
}

export async function notifyRankedServerLive(
  userIds: string[],
  map: string,
  host: string,
  port: number,
) {
  const connect = formatConnectCommand(host, port) ?? `connect ${host}:${port}`;
  const mapLabel = formatMapLabel(map) ?? map;
  await notifyRankedUsers(userIds, {
    titleKey: "match.serverLive.title",
    bodyKey: "match.serverLive.body",
    params: { map: mapLabel, connect, action: "ranked" },
    fallbackTitle: "Servidor pronto",
    fallbackBody: `Mapa ${mapLabel} — ${connect}`,
  });
}
