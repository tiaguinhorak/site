import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { isDiscordBotRequest } from "@/lib/discord/bot-auth";
import { createDiscordLinkCode, DiscordLinkError } from "@/lib/discord/link-service";

const bodySchema = z.object({
  discordUserId: z.string().min(1),
  discordUsername: z.string().max(64).default(""),
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

  try {
    const { code, expiresAt } = await createDiscordLinkCode(parsed.data);

    return NextResponse.json({
      code,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof DiscordLinkError) {
      return NextResponse.json({ error: error.message, code: "ALREADY_LINKED" }, { status: error.status });
    }
    console.error("[discord/link-codes]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
