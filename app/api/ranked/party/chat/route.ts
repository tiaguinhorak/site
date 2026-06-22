import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { handleApiError } from "@/lib/i18n/api-route";
import {
  getPartyMessagesForUser,
  postPartyMessage,
} from "@/lib/ranked/party-chat";
import { RankedPartyError } from "@/lib/ranked/party-service";

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const messages = await getPartyMessagesForUser(session!.userId);
    return NextResponse.json({ messages });
  } catch (err) {
    return handleApiError(request, err);
  }
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-party-chat",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const { data, error: parseError } = await parseJsonBody<{ body?: unknown }>(request);
    if (parseError) return parseError;
    const body = typeof data?.body === "string" ? data.body : "";
    const messages = await postPartyMessage(session!.userId, body);
    return NextResponse.json({ messages });
  } catch (err) {
    return handleApiError(request, err);
  }
}
