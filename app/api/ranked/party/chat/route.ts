import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/security/api-guard";
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
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const data = (await request.json().catch(() => ({}))) as { body?: unknown };
    const body = typeof data.body === "string" ? data.body : "";
    const messages = await postPartyMessage(session!.userId, body);
    return NextResponse.json({ messages });
  } catch (err) {
    return handleApiError(request, err);
  }
}
