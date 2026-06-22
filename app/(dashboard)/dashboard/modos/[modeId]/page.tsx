import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { GameModeRoomsSection } from "@/components/dashboard/game-mode-rooms-section";
import { getGameModeBySlug } from "@/lib/queries";

type ModePageProps = {
  params: Promise<{ modeId: string }>;
};

export default async function ModePage({ params }: ModePageProps) {
  const { modeId } = await params;
  const mode = await getGameModeBySlug(modeId);
  const t = await getTranslations("pageHeaders");
  const tl = await getTranslations("lobbyDetail");

  if (!mode) {
    notFound();
  }

  const view = {
    id: mode.slug,
    name: mode.name,
    accent: mode.accent,
    rooms: mode.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      map: room.map,
      players: room.players,
      slots: room.slots,
      ping: room.ping,
    })),
  };

  return (
    <DashboardPageShell
      title={mode.name}
      description={t("modesDesc")}
    >
      <Link
        href="/dashboard/lobby"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {tl("backToLobby")}
      </Link>
      <GameModeRoomsSection mode={view} />
    </DashboardPageShell>
  );
}
