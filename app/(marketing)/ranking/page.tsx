import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SeasonInfo } from "@/components/marketing/season-info";
import { Leaderboard } from "@/components/sections/leaderboard";
import { CallToAction } from "@/components/sections/cta";
import { getLeaderboard } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Ranking — clutchclube",
  description: "Ranking global Season 8 com ELO, K/D e estatísticas detalhadas.",
};

export default async function RankingPage() {
  const leaderboard = await getLeaderboard();

  return (
    <>
      <MarketingPageShell
        eyebrow="Season 8"
        title={
          <>
            Os <span className="text-gradient">melhores</span> da temporada
          </>
        }
        description="Ranking competitivo com ELO, K/D e estatísticas detalhadas. Suba de posição a cada partida."
      >
        <SeasonInfo />
        <div className="mt-10">
          <Leaderboard
            embedded
            leaderboard={leaderboard.map((p) => ({
              rank: p.rank,
              name: p.name,
              kd: p.kd,
              points: p.points,
            }))}
          />
        </div>
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
