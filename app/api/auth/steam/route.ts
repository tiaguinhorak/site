import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildSteamLoginUrl } from "@/lib/steam/openid";
import { jsonErrorKey } from "@/lib/i18n/api-route";

const VALID_MODES = new Set(["login", "register", "link", "switch"]);

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") ?? "login";
  if (!VALID_MODES.has(mode)) {
    return jsonErrorKey(request, 400, "invalidMode");
  }

  const url = buildSteamLoginUrl(mode as "login" | "register" | "link" | "switch", request);
  return NextResponse.redirect(url);
}
