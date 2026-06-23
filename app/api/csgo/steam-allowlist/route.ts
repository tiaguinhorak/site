import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSkinsSyncRequest } from "@/lib/env/skins-sync";
import { prisma } from "@/lib/prisma";
import { steamIdToAccountId } from "@/lib/steam/steam-id";

const SYNC_HEADER = "x-skins-sync-key";

export async function GET(request: NextRequest) {
  const providedKey =
    request.headers.get(SYNC_HEADER) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!isValidSkinsSyncRequest(providedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { steamId: { not: null } },
    select: { steamId: true },
  });

  const accountIds = new Set<number>();
  for (const user of users) {
    if (!user.steamId) continue;
    const id = steamIdToAccountId(user.steamId);
    if (id != null) accountIds.add(id);
  }

  return NextResponse.json({
    ok: true,
    count: accountIds.size,
    accountIds: [...accountIds],
  });
}
