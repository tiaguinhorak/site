import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { isDiscordBotRequest } from "@/lib/discord/bot-auth";
import {
  DISCORD_FEED_TYPES,
  isDiscordFeedType,
  listDiscordBotFeedChannels,
  removeDiscordBotFeedChannel,
  touchDiscordBotFeedRun,
  upsertDiscordBotFeedChannel,
  saveDiscordBotFeedMessageId,
} from "@/lib/discord/feed-config-service";

const upsertSchema = z.object({
  guildId: z.string().min(1),
  feedType: z.enum(DISCORD_FEED_TYPES),
  channelId: z.string().min(1),
  enabled: z.boolean().optional(),
  intervalMinutes: z.coerce.number().int().min(1).max(10_080).optional(),
});

export async function GET(request: NextRequest) {
  if (!isDiscordBotRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildId = request.nextUrl.searchParams.get("guildId")?.trim();
  if (!guildId) {
    return NextResponse.json({ error: "guildId required" }, { status: 400 });
  }

  const channels = await listDiscordBotFeedChannels(guildId);
  return NextResponse.json({ channels });
}

export async function PUT(request: NextRequest) {
  if (!isDiscordBotRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const channel = await upsertDiscordBotFeedChannel(parsed.data);
  return NextResponse.json({ channel });
}

export async function DELETE(request: NextRequest) {
  if (!isDiscordBotRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildId = request.nextUrl.searchParams.get("guildId")?.trim();
  const feedType = request.nextUrl.searchParams.get("feedType")?.trim();

  if (!guildId || !feedType || !isDiscordFeedType(feedType)) {
    return NextResponse.json({ error: "guildId and feedType required" }, { status: 400 });
  }

  const removed = await removeDiscordBotFeedChannel(guildId, feedType);
  return NextResponse.json({ ok: true, removed });
}

export async function PATCH(request: NextRequest) {
  if (!isDiscordBotRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z
    .discriminatedUnion("action", [
      z.object({
        guildId: z.string().min(1),
        feedType: z.enum(DISCORD_FEED_TYPES),
        action: z.literal("touch"),
      }),
      z.object({
        guildId: z.string().min(1),
        feedType: z.enum(DISCORD_FEED_TYPES),
        action: z.literal("message"),
        messageId: z.string().min(1),
      }),
    ])
    .safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.action === "touch") {
    await touchDiscordBotFeedRun(parsed.data.guildId, parsed.data.feedType);
  } else {
    await saveDiscordBotFeedMessageId(
      parsed.data.guildId,
      parsed.data.feedType,
      parsed.data.messageId,
    );
  }
  return NextResponse.json({ ok: true });
}
