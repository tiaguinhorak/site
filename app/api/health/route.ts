import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessionSecret = process.env.SESSION_SECRET?.trim() ?? "";
  const appUrl = process.env.APP_URL?.trim() ?? "";
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

  const env = {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    appUrl: appUrl || null,
    hasSessionSecret: sessionSecret.length >= 32,
    hasDatabaseUrl: Boolean(databaseUrl),
    hasSteamApiKey: Boolean(process.env.STEAM_API_KEY?.trim()),
  };

  let databaseOk = false;
  let databaseError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch (error) {
    databaseError = error instanceof Error ? error.message : String(error);
  }

  const ok =
    env.hasSessionSecret &&
    env.hasDatabaseUrl &&
    Boolean(env.appUrl) &&
    databaseOk;

  return NextResponse.json(
    {
      ok,
      env,
      database: { ok: databaseOk, error: databaseError },
    },
    { status: ok ? 200 : 503 },
  );
}
