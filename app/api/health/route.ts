import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { probeOutboundUrl } from "@/lib/steam/fetch-with-timeout";
import { checkStorageHealth, getStorageConfig } from "@/lib/storage";
import { hasSteamApiKey } from "@/lib/steam/api-key";
import { syncStaleSteamProfilesBackground } from "@/lib/steam/sync-profiles-background";

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
  syncStaleSteamProfilesBackground();

  const sessionSecret = process.env.SESSION_SECRET?.trim() ?? "";
  const appUrl = process.env.APP_URL?.trim() ?? "";
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

  const env = {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    appUrl: appUrl || null,
    hasSessionSecret: sessionSecret.length >= 32,
    hasDatabaseUrl: Boolean(databaseUrl),
    hasSteamApiKey: hasSteamApiKey(),
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

  const [steamCommunity, steamApi, storage] = await Promise.all([
    probeOutboundUrl("https://steamcommunity.com/openid/login", 5_000),
    probeOutboundUrl("https://api.steampowered.com/", 5_000),
    checkStorageHealth(),
  ]);

  const storageConfig = getStorageConfig();
  const outboundOk = steamCommunity.ok && steamApi.ok;

  const ok =
    env.hasSessionSecret &&
    env.hasDatabaseUrl &&
    Boolean(env.appUrl) &&
    databaseOk &&
    outboundOk &&
    storage.ok;

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
      storage: {
        ok: storage.ok,
        driver: storageConfig.driver,
        uploadRoot: storageConfig.uploadRoot,
        error: storage.error ?? null,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
