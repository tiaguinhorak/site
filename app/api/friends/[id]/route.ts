import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import { respondToRequest, removeFriendship, FriendError } from "@/lib/friends/service";

const schema = z.object({ action: z.enum(["accept", "reject", "remove"]) });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "friend-action",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    switch (parsed.data.action) {
      case "accept":
        await respondToRequest(userId, id, true);
        break;
      case "reject":
        await respondToRequest(userId, id, false);
        break;
      case "remove":
        await removeFriendship(userId, id);
        break;
      default: {
        const _exhaustive: never = parsed.data.action;
        throw new Error(`Ação não suportada: ${_exhaustive}`);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FriendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao processar amizade." }, { status: 500 });
  }
}
