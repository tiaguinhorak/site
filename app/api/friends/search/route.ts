import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { searchUsers } from "@/lib/friends/service";
import { jsonErrorKey } from "@/lib/i18n/api-route";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchUsers(userId, query);
  return NextResponse.json({ results });
}
