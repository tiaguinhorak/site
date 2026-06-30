import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  DiscordLinkError,
  getDiscordLinkStatus,
  redeemDiscordLinkCode,
  unlinkDiscordAccount,
} from "@/lib/discord/link-service";
import { serializeUser } from "@/lib/serializers";
import { prisma } from "@/lib/prisma";

const linkSchema = z.object({
  code: z.string().min(4).max(16),
});

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const status = await getDiscordLinkStatus(userId);
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = linkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  try {
    await redeemDiscordLinkCode(userId, parsed.data.code);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return NextResponse.json({ ok: true, user: serializeUser(user) });
  } catch (error) {
    if (error instanceof DiscordLinkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Falha ao vincular Discord." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  await unlinkDiscordAccount(userId);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return NextResponse.json({ ok: true, user: serializeUser(user) });
}
