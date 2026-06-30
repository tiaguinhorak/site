import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { listUserMissions } from "@/lib/missions/service";
import { jsonErrorKey } from "@/lib/i18n/api-route";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const missions = await listUserMissions(userId);
  return NextResponse.json({ missions });
}
