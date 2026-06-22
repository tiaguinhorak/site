import type { NextRequest } from "next/server";
import { handleCsgoProxy } from "@/lib/csgo-api/proxy";

type Params = { params: Promise<{ steamId: string; playerSkinId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  return handleCsgoProxy(request, "/api/skins/player/[steamId]/[playerSkinId]", "admin", {
    params,
  });
}
