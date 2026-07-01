import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyApiGuards, requireSession } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { listUserPixPrizes } from "@/lib/ranked/pix-payout-service";

export async function GET(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-pix-prizes",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const prizes = await listUserPixPrizes(session!.userId);
  return NextResponse.json({ prizes });
}
