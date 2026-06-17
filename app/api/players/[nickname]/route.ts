import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePublicPlayer } from "@/lib/profile/serialize-public";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ nickname: string }> },
) {
  const { nickname } = await context.params;
  const normalized = nickname.trim().toUpperCase();

  if (!normalized || normalized.length < 3) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  const user = await prisma.user.findFirst({
    where: { nickname: normalized },
  });

  if (!user) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ player: serializePublicPlayer(user) });
}
