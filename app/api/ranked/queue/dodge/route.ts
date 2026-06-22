import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { applyRankedQueueDodge } from "@/lib/ranked/queue-restriction";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-queue-dodge",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  let reason: "timeout" | "leave" = "timeout";
  const { data, error: parseError } = await parseJsonBody(request);
  if (!parseError && data && typeof data === "object" && "reason" in data) {
    if ((data as { reason?: string }).reason === "leave") reason = "leave";
  }

  const restriction = await applyRankedQueueDodge(session!.userId, reason);
  return NextResponse.json({ ok: true, restriction });
}
