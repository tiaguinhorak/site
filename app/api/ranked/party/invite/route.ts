import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import { areFriends } from "@/lib/friends/service";
import { getPartyForUser } from "@/lib/ranked/party-service";
import { RANKED_TEAM_SIZE } from "@/lib/ranked";
import { publishRankedInvite } from "@/lib/realtime/notify";
import { isOnline } from "@/lib/realtime/presence";
import type { RankedInvitePayload } from "@/lib/realtime/types";

const schema = z.object({ toUserId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-party-invite",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
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

  const targetUserId = parsed.data.toUserId;
  if (targetUserId === userId) {
    return NextResponse.json({ error: "Você não pode se convidar." }, { status: 400 });
  }

  if (!(await areFriends(userId, targetUserId))) {
    return NextResponse.json({ error: "Vocês não são amigos." }, { status: 403 });
  }

  const party = await getPartyForUser(userId);
  if (!party) {
    return NextResponse.json({ error: "Você não está em uma sala." }, { status: 400 });
  }
  if (!party.isLeader) {
    return NextResponse.json(
      { error: "Somente o líder da sala pode convidar." },
      { status: 403 },
    );
  }
  if (party.memberCount >= RANKED_TEAM_SIZE) {
    return NextResponse.json({ error: "Sua sala está cheia." }, { status: 409 });
  }
  if (party.members.some((m) => m.id === targetUserId)) {
    return NextResponse.json({ error: "Este jogador já está na sala." }, { status: 409 });
  }

  const leader = party.members.find((m) => m.isLeader) ?? party.members[0];
  const invite: RankedInvitePayload = {
    partyId: party.id,
    inviteCode: party.inviteCode,
    fromUserId: userId,
    fromDisplayName: party.leaderDisplayName,
    fromAvatarUrl: leader?.avatarUrl ?? null,
    partyName: party.name,
  };

  publishRankedInvite(targetUserId, invite);

  return NextResponse.json({ ok: true, delivered: isOnline(targetUserId), invite });
}
