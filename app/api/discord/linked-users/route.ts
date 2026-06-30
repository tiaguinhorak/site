import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDiscordBotRequest } from "@/lib/discord/bot-auth";
import { listLinkedDiscordUsers } from "@/lib/discord/link-service";

export async function GET(request: NextRequest) {
  if (!isDiscordBotRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await listLinkedDiscordUsers();
  return NextResponse.json({ users });
}
