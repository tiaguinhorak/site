import { notFound } from "next/navigation";
import { PublicProfilePage } from "@/components/profile/public-profile-page";
import { prisma } from "@/lib/prisma";
import { serializePublicPlayer } from "@/lib/profile/serialize-public";

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

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <PublicProfilePage initialPlayer={player} />
    </div>
  );
}
