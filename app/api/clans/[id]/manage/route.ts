import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import {
  kickMember,
  setMemberRole,
  disbandClan,
  reviewJoinRequest,
  inviteMemberByNickname,
  updateClanSettings,
  ClanError,
} from "@/lib/clans/service";

const manageSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("kick"), targetUserId: z.string().min(1) }),
  z.object({
    action: z.literal("role"),
    targetUserId: z.string().min(1),
    role: z.enum(["OFFICER", "MEMBER"]),
  }),
  z.object({ action: z.literal("disband") }),
  z.object({
    action: z.literal("review_request"),
    requestId: z.string().min(1),
    approve: z.boolean(),
  }),
  z.object({ action: z.literal("invite"), nickname: z.string().min(2).max(64) }),
  z.object({
    action: z.literal("settings"),
    description: z.string().max(500).optional(),
    joinMode: z.enum(["OPEN", "CLOSED"]).optional(),
  }),
]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "clan-manage",
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

  const parsed = manageSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const payload = parsed.data;
    switch (payload.action) {
      case "kick":
        await kickMember(userId, id, payload.targetUserId);
        break;
      case "role":
        await setMemberRole(userId, id, payload.targetUserId, payload.role);
        break;
      case "disband":
        await disbandClan(userId, id);
        break;
      case "review_request":
        await reviewJoinRequest(userId, id, payload.requestId, payload.approve);
        break;
      case "invite":
        await inviteMemberByNickname(userId, id, payload.nickname);
        break;
      case "settings": {
        await updateClanSettings(userId, id, {
          description: payload.description,
          joinMode: payload.joinMode,
        });
        break;
      }
      default: {
        const _exhaustive: never = payload;
        throw new Error(`Ação não suportada: ${JSON.stringify(_exhaustive)}`);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ClanError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao gerenciar clã." }, { status: 500 });
  }
}
