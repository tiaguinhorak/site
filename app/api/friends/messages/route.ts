import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import { FriendError } from "@/lib/friends/service";
import {
  DM_MAX_LENGTH,
  getConversation,
  getUnreadCounts,
  sendDirectMessage,
} from "@/lib/friends/messages";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const withUserId = request.nextUrl.searchParams.get("withUserId");
  if (withUserId) {
    try {
      const messages = await getConversation(userId, withUserId);
      return NextResponse.json({ messages });
    } catch (err) {
      if (err instanceof FriendError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: "Falha ao carregar conversa." }, { status: 500 });
    }
  }

  const unread = await getUnreadCounts(userId);
  return NextResponse.json({ unread });
}

const schema = z.object({
  toUserId: z.string().min(1),
  body: z.string().min(1).max(DM_MAX_LENGTH),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "friend-dm",
    RATE_LIMITS.chat.limit,
    RATE_LIMITS.chat.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const message = await sendDirectMessage(userId, parsed.data.toUserId, parsed.data.body);
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    if (err instanceof FriendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao enviar mensagem." }, { status: 500 });
  }
}
