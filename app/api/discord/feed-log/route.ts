import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { isDiscordBotRequest } from "@/lib/discord/bot-auth";
import { DISCORD_FEED_TYPES, claimDiscordFeedItem } from "@/lib/discord/feed-config-service";

const bodySchema = z.object({
  feedType: z.enum(DISCORD_FEED_TYPES),
  itemKey: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  if (!isDiscordBotRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const claimed = await claimDiscordFeedItem(parsed.data.feedType, parsed.data.itemKey);
  return NextResponse.json({ publish: claimed });
}
