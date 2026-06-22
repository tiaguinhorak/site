import type { NextRequest } from "next/server";
import { handleCsgoProxy } from "@/lib/csgo-api/proxy";

type Params = { params: Promise<{ steamId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return handleCsgoProxy(request, "/api/skins/player/[steamId]", "session", { params });
}
