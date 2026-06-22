import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/security/api-guard";
import { getRankedQueueRestrictionForUser } from "@/lib/ranked/queue-restriction";

export async function GET(request: NextRequest) {
  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const restriction = await getRankedQueueRestrictionForUser(session!.userId);
  if (!restriction) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ restriction });
}
