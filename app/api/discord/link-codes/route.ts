import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { isDiscordBotRequest } from "@/lib/discord/bot-auth";
import { createDiscordLinkCode } from "@/lib/discord/link-service";

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

  const { code, expiresAt } = await createDiscordLinkCode(parsed.data);

  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
  });
}
