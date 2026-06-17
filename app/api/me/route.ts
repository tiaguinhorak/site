import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { serializeUser } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({ user: serializeUser(user) });
}
