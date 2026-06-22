import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { serializeUser } from "@/lib/serializers";
import { jsonErrorKey } from "@/lib/i18n/api-route";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return jsonErrorKey(request, 401, "unauthorized");
  }
  return NextResponse.json({ user: serializeUser(user) });
}
