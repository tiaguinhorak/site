import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRequestLocale } from "@/lib/i18n/server";
import { listWarmupModes, toWarmupModeDef } from "@/lib/warmup/modes-service";

export async function GET(request: NextRequest) {
  const includeDisabled = request.nextUrl.searchParams.get("all") === "1";
  const locale = await getRequestLocale(request);
  const modes = await listWarmupModes({ includeDisabled, locale });
  return NextResponse.json({
    modes: modes.map(toWarmupModeDef),
  });
}
