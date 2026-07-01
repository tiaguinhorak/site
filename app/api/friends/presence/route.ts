import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getFriendIds } from "@/lib/friends/service";
import { filterOnline } from "@/lib/realtime/presence";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const friendIds = await getFriendIds(userId);
  const online = filterOnline(friendIds);
  return NextResponse.json({ online });
}
