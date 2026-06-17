"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/reveal";
import { resolveIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

export type MarketingGameModeView = {
  name: string;
  tagline: string;
  description: string;
  accent: string;
  iconKey: string;
};

export function GameModes({
  embedded = false,
  modes,
}: {
  embedded?: boolean;
  modes: MarketingGameModeView[];
}) {
  return (
    <section
      id={embedded ? undefined : "modos"}
      className={cn(embedded ? "" : "relative scroll-mt-24 py-24")}
    >
      <div className={cn(embedded ? "" : "mx-auto max-w-6xl px-4 sm:px-6")}>
        {!embedded && (
          <SectionHeading
            eyebrow="Modos de jogo"
            title={
              <>
                Para cada estilo,{" "}
                <span className="text-gradient">o modo certo</span>
              </>
            }
            description="Do iniciante ao profissional. Escolha como quer treinar e evolua a cada round."
          />
        )}

        <div
          className={cn(
            "grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4",
            !embedded && "mt-12",
          )}
        >
          {modes.map((mode, i) => {
            const Icon = resolveIcon(mode.iconKey);
            return (
              <motion.article
                key={mode.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-card glass p-6 transition-shadow duration-300 hover:glow-ring-contained sm:p-7"
              >
                <div
                  className={cn(
                    "absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40",
                    mode.accent,
                  )}
                  aria-hidden
                />
                <div className="relative">
                  <div
                    className={cn(
                      "inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                      mode.accent,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="mt-5 font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {mode.tagline}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-bold text-foreground">
                    {mode.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {mode.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-foreground opacity-0 transition-all duration-300 group-hover:opacity-100">
                    Jogar
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
