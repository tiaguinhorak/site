import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getUserInventory } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const items = await getUserInventory(userId);
  return NextResponse.json({ items });
}
