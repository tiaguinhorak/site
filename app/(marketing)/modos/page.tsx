import { getMarketingGameModes } from "@/lib/queries";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { GameModes } from "@/components/sections/game-modes";
import { CallToAction } from "@/components/sections/cta";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Modos de jogo — clutchclube",
  description: "Retakes, Deathmatch, ForFun e Movimentação nos servidores clutchclube.",
};

export default async function ModosPage() {
  const dbModes = await getMarketingGameModes();
  const modes = dbModes.map((m) => ({
    name: m.name,
    tagline: m.tagline,
    description: m.description,
    accent: m.accent,
    iconKey: m.iconKey,
  }));

  return (
    <>
      <MarketingPageShell
        eyebrow="Modos de jogo"
        title={
          <>
            Para cada estilo,{" "}
            <span className="text-gradient">o modo certo</span>
          </>
        }
        description="Do iniciante ao profissional. Escolha como quer treinar e evolua a cada round."
      >
        <GameModes embedded modes={modes} />
        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-card glass p-6 sm:flex-row">
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              Pronto para jogar?
            </p>
            <p className="mt-1 text-sm text-muted">
              Crie sua conta e conecte ao melhor servidor em um clique.
            </p>
          </div>
          <ButtonLink href="/register" variant="primary" size="md">
            Criar conta grátis
          </ButtonLink>
        </div>
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
