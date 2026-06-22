import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  acceptMatchSession,
  cancelRankedMatchSession,
  castMapVote,
  finishRankedMatchSession,
  getActiveSessionForUser,
  getMapVoteStateForUser,
  getPostMatchSessionForUser,
  leaveMatchRoom,
  rematchRankedSession,
  swapTeamsRematch,
} from "@/lib/ranked/match-session-service";
import { forceClearUserRankedState } from "@/lib/ranked/reconcile-stale-sessions";
import { RankedPartyError } from "@/lib/ranked/party-service";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { handleApiError, jsonErrorKey } from "@/lib/i18n/api-route";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const active = await getActiveSessionForUser(session!.userId);
    if (!active) {
      const postMatch = await getPostMatchSessionForUser(session!.userId);
      return NextResponse.json({ session: null, vote: null, postMatch });
    }

    const { session: refreshed, vote, launchMessage } = await getMapVoteStateForUser(
      session!.userId,
      active.id,
    );
    return NextResponse.json({ session: refreshed, vote, launchMessage, postMatch: null });
  } catch (err) {
    return handleApiError(request, err);
  }
}

const acceptSchema = z.object({ sessionId: z.string().min(1) });
const voteSchema = z.object({ sessionId: z.string().min(1), map: z.string().min(1) });
const cancelSchema = z.object({ sessionId: z.string().min(1) });
const sessionIdSchema = z.object({ sessionId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-session",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const action = typeof data === "object" && data && "action" in data ? data.action : null;

  try {
    if (action === "accept") {
      const parsed = acceptSchema.safeParse(data);
      if (!parsed.success) return jsonError(400, firstZodError(parsed.error));
      const matchSession = await acceptMatchSession(
        session!.userId,
        parsed.data.sessionId,
      );
      return NextResponse.json({ session: matchSession });
    }

    if (action === "vote") {
      const parsed = voteSchema.safeParse(data);
      if (!parsed.success) return jsonError(400, firstZodError(parsed.error));
      const result = await castMapVote(
        session!.userId,
        parsed.data.sessionId,
        parsed.data.map,
      );
      return NextResponse.json(result);
    }

    if (action === "cancel") {
      const parsed = cancelSchema.safeParse(data);
      if (!parsed.success) return jsonError(400, firstZodError(parsed.error));
      await cancelRankedMatchSession(session!.userId, parsed.data.sessionId);
      return NextResponse.json({ ok: true, session: null, vote: null });
    }

    if (action === "finish") {
      const parsed = sessionIdSchema.safeParse(data);
      if (!parsed.success) return jsonError(400, firstZodError(parsed.error));
      const finished = await finishRankedMatchSession(
        session!.userId,
        parsed.data.sessionId,
      );
      return NextResponse.json({ session: finished, postMatch: finished });
    }

    if (action === "rematch") {
      const parsed = sessionIdSchema.safeParse(data);
      if (!parsed.success) return jsonError(400, firstZodError(parsed.error));
      const next = await rematchRankedSession(session!.userId, parsed.data.sessionId);
      return NextResponse.json({ session: next, vote: null });
    }

    if (action === "swap-rematch") {
      const parsed = sessionIdSchema.safeParse(data);
      if (!parsed.success) return jsonError(400, firstZodError(parsed.error));
      const next = await swapTeamsRematch(session!.userId, parsed.data.sessionId);
      return NextResponse.json({ session: next, vote: null });
    }

    if (action === "leave-room") {
      await leaveMatchRoom(session!.userId);
      return NextResponse.json({ ok: true, session: null, vote: null, postMatch: null });
    }

    if (action === "force-clear") {
      const result = await forceClearUserRankedState(session!.userId);
      return NextResponse.json({
        ok: true,
        cleared: result.cleared,
        session: null,
        vote: null,
        postMatch: null,
      });
    }

    return jsonErrorKey(request, 400, "invalidAction");
  } catch (err) {
    return handleApiError(request, err);
  }
}
