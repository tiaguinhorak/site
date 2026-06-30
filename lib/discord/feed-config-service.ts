import "server-only";

import { prisma } from "@/lib/prisma";

export const DISCORD_FEED_TYPES = ["news", "ranking", "live", "servidores"] as const;
export type DiscordFeedType = (typeof DISCORD_FEED_TYPES)[number];

export function isDiscordFeedType(value: string): value is DiscordFeedType {
  return DISCORD_FEED_TYPES.includes(value as DiscordFeedType);
}

export type DiscordBotFeedChannelRow = {
  feedType: DiscordFeedType;
  channelId: string;
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  lastMessageId: string | null;
};

export async function listDiscordBotFeedChannels(
  guildId: string,
): Promise<DiscordBotFeedChannelRow[]> {
  const rows = await prisma.discordBotFeedChannel.findMany({
    where: { guildId },
    orderBy: { feedType: "asc" },
  });

  return rows.map((row) => ({
    feedType: row.feedType as DiscordFeedType,
    channelId: row.channelId,
    enabled: row.enabled,
    intervalMinutes: row.intervalMinutes,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastMessageId: row.lastMessageId ?? null,
  }));
}

export async function upsertDiscordBotFeedChannel(input: {
  guildId: string;
  feedType: DiscordFeedType;
  channelId: string;
  enabled?: boolean;
  intervalMinutes?: number;
}): Promise<DiscordBotFeedChannelRow> {
  const existing = await prisma.discordBotFeedChannel.findUnique({
    where: {
      guildId_feedType: { guildId: input.guildId, feedType: input.feedType },
    },
    select: { channelId: true },
  });

  const channelChanged =
    existing !== null && existing.channelId !== input.channelId;

  const row = await prisma.discordBotFeedChannel.upsert({
    where: {
      guildId_feedType: { guildId: input.guildId, feedType: input.feedType },
    },
    create: {
      guildId: input.guildId,
      feedType: input.feedType,
      channelId: input.channelId,
      enabled: input.enabled ?? true,
      intervalMinutes: input.intervalMinutes ?? defaultIntervalMinutes(input.feedType),
    },
    update: {
      channelId: input.channelId,
      enabled: input.enabled ?? true,
      ...(channelChanged ? { lastMessageId: null } : {}),
      ...(input.intervalMinutes !== undefined
        ? { intervalMinutes: input.intervalMinutes }
        : {}),
    },
  });

  return {
    feedType: row.feedType as DiscordFeedType,
    channelId: row.channelId,
    enabled: row.enabled,
    intervalMinutes: row.intervalMinutes,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastMessageId: row.lastMessageId ?? null,
  };
}

export async function saveDiscordBotFeedMessageId(
  guildId: string,
  feedType: DiscordFeedType,
  messageId: string,
): Promise<void> {
  await prisma.discordBotFeedChannel.updateMany({
    where: { guildId, feedType },
    data: { lastMessageId: messageId },
  });
}

export async function removeDiscordBotFeedChannel(
  guildId: string,
  feedType: DiscordFeedType,
): Promise<boolean> {
  const result = await prisma.discordBotFeedChannel.deleteMany({
    where: { guildId, feedType },
  });
  return result.count > 0;
}

export async function touchDiscordBotFeedRun(
  guildId: string,
  feedType: DiscordFeedType,
): Promise<void> {
  await prisma.discordBotFeedChannel.updateMany({
    where: { guildId, feedType },
    data: { lastRunAt: new Date() },
  });
}

export async function claimDiscordFeedItem(
  feedType: DiscordFeedType,
  itemKey: string,
): Promise<boolean> {
  try {
    await prisma.discordFeedPublishLog.create({
      data: { feedType, itemKey },
    });
    return true;
  } catch {
    return false;
  }
}

function defaultIntervalMinutes(feedType: DiscordFeedType): number {
  switch (feedType) {
    case "news":
      return 60;
    case "ranking":
      return 360;
    case "live":
      return 3;
    case "servidores":
      return 5;
    default: {
      const _exhaustive: never = feedType;
      return _exhaustive;
    }
  }
}

export function feedTypeLabel(feedType: DiscordFeedType): string {
  switch (feedType) {
    case "news":
      return "Notícias";
    case "ranking":
      return "Ranking";
    case "live":
      return "Partidas ao vivo";
    case "servidores":
      return "Servidores";
    default: {
      const _exhaustive: never = feedType;
      return _exhaustive;
    }
  }
}
