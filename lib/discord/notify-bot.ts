import "server-only";
import { getDiscordBotApiKey, getDiscordBotUrl } from "@/lib/env/discord-bot";

const AUTH_HEADER = "x-discord-bot-key";

type MatchFinishedNotify = {
  type: "match.finished";
  data: {
    sessionId: string;
    map: string;
    scoreTeamA: number;
    scoreTeamB: number;
    winnerTeam: "A" | "B" | null;
    durationSec: number;
    profileUrl?: string;
  };
};

type AnnouncementNotify = {
  type: "announcement";
  data: {
    title: string;
    description: string;
    url?: string;
  };
};

type UserLinkedNotify = {
  type: "user.linked";
  data: {
    discordUserId: string;
    plan: "free" | "premium" | "elite";
  };
};

type UserUnlinkedNotify = {
  type: "user.unlinked";
  data: {
    discordUserId: string;
  };
};

type ServerOnlineNotify = {
  type: "server.online";
  data: {
    name: string;
    host: string;
    port: number;
    players?: number;
    slots?: number;
    map?: string;
  };
};

type ServerOfflineNotify = {
  type: "server.offline";
  data: {
    name: string;
    host: string;
    port: number;
    players?: number;
    slots?: number;
    map?: string;
  };
};

type ServersRefreshNotify = {
  type: "servers.refresh";
  data?: Record<string, never>;
};

export type DiscordBotNotifyPayload =
  | MatchFinishedNotify
  | AnnouncementNotify
  | UserLinkedNotify
  | UserUnlinkedNotify
  | ServerOnlineNotify
  | ServerOfflineNotify
  | ServersRefreshNotify;

export async function notifyDiscordBot(payload: DiscordBotNotifyPayload): Promise<void> {
  const baseUrl = getDiscordBotUrl();
  const apiKey = getDiscordBotApiKey();

  if (!baseUrl || !apiKey) return;

  const url = new URL("/notify", baseUrl);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [AUTH_HEADER]: apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[discord-bot] notify failed", response.status, text.slice(0, 200));
    }
  } catch (error) {
    console.error("[discord-bot] notify error", error);
  }
}

export async function notifyDiscordMatchFinished(input: {
  sessionId: string;
  map: string;
  scoreTeamA: number;
  scoreTeamB: number;
  winnerTeam: "A" | "B" | null;
  durationSec: number;
}): Promise<void> {
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");

  await notifyDiscordBot({
    type: "match.finished",
    data: {
      ...input,
      profileUrl: appUrl ? `${appUrl}/dashboard/partidas` : undefined,
    },
  });
}

export async function notifyDiscordUserLinked(input: {
  discordUserId: string;
  plan: "free" | "premium" | "elite";
}): Promise<void> {
  await notifyDiscordBot({
    type: "user.linked",
    data: input,
  });
}

export async function notifyDiscordUserUnlinked(input: {
  discordUserId: string;
}): Promise<void> {
  await notifyDiscordBot({
    type: "user.unlinked",
    data: input,
  });
}

/** Atualiza imediatamente o embed único de servidores no Discord. */
export async function notifyDiscordServersRefresh(): Promise<void> {
  await notifyDiscordBot({ type: "servers.refresh", data: {} });
}

export async function notifyDiscordServerOnline(input: {
  name: string;
  host: string;
  port: number;
  map?: string;
  players?: number;
  slots?: number;
}): Promise<void> {
  await notifyDiscordBot({ type: "server.online", data: input });
}

export async function notifyDiscordServerOffline(input: {
  name: string;
  host: string;
  port: number;
  map?: string;
}): Promise<void> {
  await notifyDiscordBot({ type: "server.offline", data: input });
}
