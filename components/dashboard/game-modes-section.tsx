"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { resolveIcon } from "@/lib/icon-map";
import { findGradientByClasses } from "@/lib/admin/content-presets";
import { cn } from "@/lib/utils";

type GameModeCard = {
  id: string;
  name: string;
  accent: string;
  iconKey?: string;
  totalPlayers: number;
};

export function GameModesSection() {
  const t = useTranslations("gameModes");
  const [modes, setModes] = useState<GameModeCard[]>([]);

  useEffect(() => {
    fetch("/api/game-modes")
      .then((r) => r.json())
      .then((data) => setModes(data.modes ?? []))
      .catch(() => setModes([]));
  }, []);

  return (
    <section>
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {modes.map((mode, i) => {
          const Icon = resolveIcon(mode.iconKey ?? "Crosshair");
          const grad = findGradientByClasses(mode.accent);
          return (
          <motion.article
            key={mode.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-card glass p-5 transition-shadow duration-300 hover:glow-ring-contained sm:p-6"
          >
            <div
              className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-35 ${mode.accent}`}
              aria-hidden
            />

            <div className="relative flex flex-col items-center text-center">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg",
                  !grad && `bg-gradient-to-br ${mode.accent}`,
                )}
                style={
                  grad
                    ? { background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }
                    : undefined
                }
              >
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                {mode.name}
              </h3>

              <p className="mt-2 text-sm text-muted">
                {t("playersOnline", { count: mode.totalPlayers })}
              </p>

              <ButtonLink
                href={`/dashboard/modos/${mode.id}`}
                variant="primary"
                size="sm"
                className="mt-5 w-full"
              >
                {t("enter")}
              </ButtonLink>
            </div>
          </motion.article>
          );
        })}
      </div>
    </section>
  );
}
