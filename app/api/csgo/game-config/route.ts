import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSkinsSyncRequest } from "@/lib/env/skins-sync";
import { resolveServerGameConfig } from "@/lib/csgo/server-game-config";

const SYNC_HEADER = "x-skins-sync-key";

/** api-csgo fetches gameplay config for a pool on server start / ranked match start. */
export async function GET(request: NextRequest) {
  const providedKey =
    request.headers.get(SYNC_HEADER) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!isValidSkinsSyncRequest(providedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = request.nextUrl.searchParams.get("pool")?.trim() || "ranked";
  const config = await resolveServerGameConfig(pool);
  return NextResponse.json({ ok: true, config });
}
