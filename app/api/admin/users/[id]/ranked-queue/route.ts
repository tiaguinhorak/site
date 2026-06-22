import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getRankedQueueRestrictionForUser } from "@/lib/ranked/queue-restriction";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const restriction = await getRankedQueueRestrictionForUser(id);
  if (!restriction) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ restriction });
}
