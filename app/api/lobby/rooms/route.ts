import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/security/api-guard";
import { jsonErrorKey } from "@/lib/i18n/api-route";

export async function POST(request: NextRequest) {
  const { error } = requireSession(request);
  if (error) return error;

  return jsonErrorKey(request, 403, "lobbyAutoCreated");
}
