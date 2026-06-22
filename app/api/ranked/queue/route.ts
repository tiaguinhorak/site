import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getRankedQueueStatus,
  joinRankedQueue,
  leaveRankedQueue,
  RankedQueueError,
} from "@/lib/ranked/queue-service";
import { RankedPartyError } from "@/lib/ranked/party-service";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { RATE_LIMITS } from "@/lib/security/constants";

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const status = await getRankedQueueStatus(session!.userId);
    return NextResponse.json({ queue: status });
  } catch (err) {
    return handleApiError(request, err);
  }
}

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "ranked-queue",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data } = await parseJsonBody(request);
  const action =
    typeof data === "object" && data && "action" in data ? String(data.action) : "join";

  try {
    if (action === "leave") {
      const queue = await leaveRankedQueue(session!.userId);
      return NextResponse.json({ queue });
    }

    const queue = await joinRankedQueue(session!.userId);
    return NextResponse.json({ queue });
  } catch (err) {
    return handleApiError(request, err);
  }
}
