import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { checkGameServerReachability } from "@/lib/inventory/game-server-push";
import { jsonErrorKey } from "@/lib/i18n/api-route";

/** Dev helper: can this site push equip/stickers to ranked api-csgo? */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const status = await checkGameServerReachability();
  return NextResponse.json({ ok: true, ...status });
}
