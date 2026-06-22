import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAllEquippedLoadoutsForSync } from "@/lib/csgo-api/services/skins";
import { isValidSkinsSyncRequest } from "@/lib/env/skins-sync";

const SYNC_HEADER = "x-skins-sync-key";

export async function GET(request: NextRequest) {
  const providedKey =
    request.headers.get(SYNC_HEADER) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!isValidSkinsSyncRequest(providedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loadouts = await getAllEquippedLoadoutsForSync();
  return NextResponse.json({
    ok: true,
    count: loadouts.length,
    loadouts,
  });
}
