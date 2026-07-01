import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { GameModeRoomsClient } from "@/components/dashboard/game-mode-rooms-client";

type ModePageProps = {
  params: Promise<{ modeId: string }>;
};

export default async function ModePage({ params }: ModePageProps) {
  const { modeId } = await params;
  const t = await getTranslations("pageHeaders");

  const exists = await prisma.gameMode.findFirst({
    where: { slug: modeId },
    select: { name: true },
  });
  if (!exists) notFound();

  return (
    <DashboardPageShell title={exists.name} description={t("modesDesc")}>
      <GameModeRoomsClient modeId={modeId} />
    </DashboardPageShell>
  );
}
