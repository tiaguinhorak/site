import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getUserServerLoadout } from "@/lib/inventory/get-user-loadout";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { jsonErrorKey } from "@/lib/i18n/api-route";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const teamParam = request.nextUrl.searchParams.get("team");
  const team =
    teamParam === "T" || teamParam === "CT" ? (teamParam as LoadoutTeam) : undefined;

  const loadout = await getUserServerLoadout(userId, team);
  return NextResponse.json(loadout);
}
