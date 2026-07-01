import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";
import { PublicProfilePageClient } from "@/components/profile/public-profile-page-client";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { nickname } = await params;
  const normalized = nickname.trim().toUpperCase();
  const user = await prisma.user.findFirst({
    where: { nickname: normalized },
    select: { rank: true, elo: true, kd: true, ...STEAM_DISPLAY_NAME_SELECT },
  });
  if (!user) return { title: "Perfil não encontrado — clutchclube" };
  const displayName = resolveSteamDisplayName(user);
  return {
    title: `${displayName} — Perfil clutchclube`,
    description: `Rank #${user.rank} · ${user.elo} ELO · K/D ${user.kd.toFixed(2)} no clutchclube.`,
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { nickname } = await params;
  const normalized = nickname.trim().toUpperCase();
  const exists = await prisma.user.findFirst({
    where: { nickname: normalized },
    select: { id: true },
  });
  if (!exists) notFound();

  return <PublicProfilePageClient nickname={normalized} />;
}
