import { NextResponse } from "next/server";
import { listWarmupModes, toWarmupModeDef } from "@/lib/warmup/modes-service";

export async function GET(request: Request) {
  const includeDisabled = new URL(request.url).searchParams.get("all") === "1";
  const modes = await listWarmupModes({ includeDisabled });
  return NextResponse.json({
    modes: modes.map(toWarmupModeDef),
  });
}
