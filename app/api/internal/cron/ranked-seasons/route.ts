import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processDueSeasonResets } from "@/lib/ranked/season-auto-reset";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("authorization")?.trim();
  if (header === `Bearer ${secret}`) return true;

  const querySecret = request.nextUrl.searchParams.get("secret")?.trim();
  return querySecret === secret;
}

/** GET — agendar via cron externo (ex.: a cada 5 min). Header: Authorization: Bearer CRON_SECRET */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const result = await processDueSeasonResets();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
