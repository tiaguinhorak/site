import "server-only";

import type { NextRequest } from "next/server";
import { getDiscordBotApiKey } from "@/lib/env/discord-bot";

const AUTH_HEADER = "x-discord-bot-key";

export function isDiscordBotRequest(request: NextRequest): boolean {
  const expected = getDiscordBotApiKey();
  if (!expected) return false;
  const provided = request.headers.get(AUTH_HEADER)?.trim();
  return Boolean(provided && provided === expected);
}
