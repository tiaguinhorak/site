import { notFound } from "next/navigation";
import { PublicProfilePage } from "@/components/profile/public-profile-page";
import { RankedMatchHistory } from "@/components/profile/ranked-match-history";
import { PublicProfileSkins } from "@/components/profile/public-profile-skins";
import { PublicProfileMedals } from "@/components/profile/public-profile-medals";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { prisma } from "@/lib/prisma";
import { serializePublicPlayer } from "@/lib/profile/serialize-public";
import { getPublicPlayerSkins } from "@/lib/inventory/get-public-player-skins";
import { getPublicUserMedals } from "@/lib/achievements/service";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { nickname } = await params;
  const normalized = nickname.trim().toUpperCase();
  const user = await prisma.user.findFirst({ where: { nickname: normalized } });
  if (!user) return { title: "Perfil não encontrado — clutchclube" };
  return {
    title: `${user.nickname} — Perfil clutchclube`,
    description: `Rank #${user.rank} · ${user.elo} ELO · K/D ${user.kd.toFixed(2)} no clutchclube.`,
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { nickname } = await params;
  const normalized = nickname.trim().toUpperCase();

  const user = await prisma.user.findFirst({
    where: { nickname: normalized },
  });

  if (!user) notFound();

  const player = serializePublicPlayer(user);
  const { groups, total } = await getPublicPlayerSkins(user.steamId);
  const medals = await getPublicUserMedals(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <PublicProfilePage initialPlayer={player} />
      <PublicProfileMedals medals={medals} level={user.level} />
      <PerformanceChart nickname={player.nickname} />
      <RankedMatchHistory nickname={player.nickname} />
      <PublicProfileSkins groups={groups} total={total} />
    </div>
  );
}
