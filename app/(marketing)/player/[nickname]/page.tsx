import { notFound } from "next/navigation";
import { PublicProfilePage } from "@/components/profile/public-profile-page";
import { RankedMatchHistory } from "@/components/profile/ranked-match-history";
import { PublicProfileSkins } from "@/components/profile/public-profile-skins";
import { PublicProfileMedals } from "@/components/profile/public-profile-medals";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { prisma } from "@/lib/prisma";
import { getPublicProfileLabels } from "@/lib/profile/public-profile-labels";
import { serializePublicPlayer } from "@/lib/profile/serialize-public";
import { getPublicPlayerSkins } from "@/lib/inventory/get-public-player-skins";
import { resolveEloRankLabels } from "@/lib/ranked/resolve-elo-rank-labels";
import { getPublicUserMedals } from "@/lib/achievements/service";
import { refreshSteamProfileIfDue } from "@/lib/steam/sync-profiles";
import { syncStaleSteamProfilesBackground } from "@/lib/steam/sync-profiles-background";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { nickname } = await params;
  const normalized = nickname.trim().toUpperCase();
  const user = await prisma.user.findFirst({ where: { nickname: normalized } });
  if (!user) return { title: "Perfil não encontrado — clutchclube" };
  const player = serializePublicPlayer(user);
  return {
    title: `${player.displayName} — Perfil clutchclube`,
    description: `Rank #${user.rank} · ${user.elo} ELO · K/D ${user.kd.toFixed(2)} no clutchclube.`,
  };
}

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({ params }: PageProps) {
  syncStaleSteamProfilesBackground();

  const { nickname } = await params;
  const normalized = nickname.trim().toUpperCase();

  let user = await prisma.user.findFirst({
    where: { nickname: normalized },
  });

  if (!user) notFound();

  if (user.steamId) {
    try {
      await refreshSteamProfileIfDue(user.id);
      user = (await prisma.user.findFirst({ where: { nickname: normalized } })) ?? user;
    } catch {
      // Mantém dados em cache se a API Steam falhar.
    }
  }

  const player = serializePublicPlayer(user);
  const eloLabels = await resolveEloRankLabels(player.elo);
  const playerWithElo = { ...player, ...eloLabels };
  const { groups, total } = await getPublicPlayerSkins(user.steamId);
  const medals = await getPublicUserMedals(user.id);
  const labels = await getPublicProfileLabels();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <PublicProfilePage initialPlayer={playerWithElo} labels={labels} />
      {(!player.customization || player.customization.profileShowAchievements) && (
        <PublicProfileMedals medals={medals} level={user.level} />
      )}
      <PerformanceChart nickname={playerWithElo.nickname} />
      <RankedMatchHistory nickname={playerWithElo.nickname} />
      <PublicProfileSkins groups={groups} total={total} />
    </div>
  );
}
