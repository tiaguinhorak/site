import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUserMedals } from "@/lib/achievements/service";
import { getPublicPlayerSkins } from "@/lib/inventory/get-public-player-skins";
import { jsonErrorKey } from "@/lib/i18n/api-route";
import { getPublicProfileLabels } from "@/lib/profile/public-profile-labels";
import { serializePublicPlayer } from "@/lib/profile/serialize-public";
import { resolveEloRankLabels } from "@/lib/ranked/resolve-elo-rank-labels";

type RouteContext = { params: Promise<{ nickname: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { nickname } = await context.params;
  const normalized = nickname.trim().toUpperCase();

  if (!normalized || normalized.length < 3) {
    return jsonErrorKey(request, 404, "profileNotFound");
  }

  const user = await prisma.user.findFirst({ where: { nickname: normalized } });
  if (!user) {
    return jsonErrorKey(request, 404, "profileNotFound");
  }

  const player = serializePublicPlayer(user);
  const [eloLabels, skins, medals, labels] = await Promise.all([
    resolveEloRankLabels(player.elo),
    getPublicPlayerSkins(user.steamId),
    getPublicUserMedals(user.id),
    getPublicProfileLabels(),
  ]);

  return NextResponse.json({
    player: { ...player, ...eloLabels },
    labels,
    medals,
    skins,
    level: user.level,
  });
}
