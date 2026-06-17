import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";

export async function requireAdmin(
  request: NextRequest,
): Promise<{ user: Awaited<ReturnType<typeof getSessionUser>>; error: NextResponse | null }> {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }),
    };
  }
  if (!user.isAdmin) {
    return {
      user: null,
      error: NextResponse.json({ error: "Acesso restrito." }, { status: 403 }),
    };
  }
  return { user, error: null };
}
