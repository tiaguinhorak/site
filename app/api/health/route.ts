import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { probeOutboundUrl } from "@/lib/steam/fetch-with-timeout";

function appUrlWarnings(appUrl: string): string[] {
  const warnings: string[] = [];
  if (!appUrl) return warnings;

  try {
    const parsed = new URL(appUrl);
    if (parsed.port === "3001") {
      warnings.push(
        "APP_URL usa porta 3001 (normalmente api-csgo). O site Next.js costuma ficar na 3000 — Steam login deve usar a mesma porta que o usuário acessa.",
      );
    }
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      warnings.push("APP_URL aponta para localhost; use o IP/domínio público do VPS.");
    }
  } catch {
    warnings.push("APP_URL inválida.");
  }

  return warnings;
}

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
    warnings: appUrlWarnings(appUrl),
  };

  let databaseOk = false;
  let databaseError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch (error) {
    databaseError = error instanceof Error ? error.message : String(error);
  }

  const [steamCommunity, steamApi] = await Promise.all([
    probeOutboundUrl("https://steamcommunity.com/openid/login", 5_000),
    probeOutboundUrl("https://api.steampowered.com/", 5_000),
  ]);

  const outboundOk = steamCommunity.ok && steamApi.ok;

  const ok =
    env.hasSessionSecret &&
    env.hasDatabaseUrl &&
    Boolean(env.appUrl) &&
    databaseOk &&
    outboundOk;

  return NextResponse.json(
    {
      ok,
      env,
      database: { ok: databaseOk, error: databaseError },
      outbound: {
        steamCommunity,
        steamApi,
        hint: outboundOk
          ? null
          : "O VPS precisa de HTTPS de saída para steamcommunity.com e api.steampowered.com (login Steam).",
      },
    },
    { status: ok ? 200 : 503 },
  );
}
