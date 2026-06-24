import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchPlayerRankedHistory } from "@/lib/leaderboard/queries";
import { jsonErrorKey } from "@/lib/i18n/api-route";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nickname: string }> },
) {
  const { nickname } = await context.params;
  const normalized = nickname.trim().toUpperCase();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");

  const user = await prisma.user.findFirst({
    where: { nickname: normalized },
    select: { id: true },
  });

  if (!user) {
    return jsonErrorKey(request, 404, "profileNotFound");
  }

  const history = await fetchPlayerRankedHistory(
    user.id,
    Number.isFinite(limit) ? Math.min(50, Math.max(1, limit)) : 20,
  );

  return NextResponse.json({ history });
}
