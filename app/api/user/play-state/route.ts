import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserPlayState } from "@/lib/play-state";
import { requireSession } from "@/lib/security/api-guard";

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  const state = await getUserPlayState(session!.userId);
  return NextResponse.json({ state });
}
