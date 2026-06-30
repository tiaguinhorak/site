import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getClanDetail, ClanError } from "@/lib/clans/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId(request);
  const { id } = await context.params;
  try {
    const clan = await getClanDetail(id, userId);
    return NextResponse.json({ clan });
  } catch (err) {
    if (err instanceof ClanError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao carregar clã." }, { status: 500 });
  }
}
