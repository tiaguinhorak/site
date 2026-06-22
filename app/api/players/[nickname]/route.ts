import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePublicPlayer } from "@/lib/profile/serialize-public";
import { jsonErrorKey } from "@/lib/i18n/api-route";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nickname: string }> },
) {
  const { nickname } = await context.params;
  const normalized = nickname.trim().toUpperCase();

  if (!normalized || normalized.length < 3) {
    return jsonErrorKey(request, 404, "profileNotFound");
  }

  const user = await prisma.user.findFirst({
    where: { nickname: normalized },
  });

  if (!user) {
    return jsonErrorKey(request, 404, "profileNotFound");
  }

  return NextResponse.json({ player: serializePublicPlayer(user) });
}
