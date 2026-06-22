"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ClipboardList, Play, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type PlayModePickerProps = {
  className?: string;
};

export function PlayModePicker({ className }: PlayModePickerProps) {
  const t = useTranslations("playPicker");
  const modes = [
    {
      id: "lobby",
      href: "/dashboard/lobby",
      title: t("lobbyTitle"),
      accent: "from-amber-400 to-yellow-500",
      border: "border-amber-400/40 hover:border-amber-400/70",
      glow: "group-hover:shadow-[0_0_40px_-8px_rgb(251_191_36/0.45)]",
      titleClass: "text-amber-400",
      icon: ClipboardList,
      description: t("lobbyDesc"),
      badge: t("lobbyBadge"),
    },
    {
      id: "ranked",
      href: "/dashboard/ranked",
      title: t("rankedTitle"),
      accent: "from-sky-400 to-cyan-500",
      border: "border-sky-400/40 hover:border-sky-400/70",
      glow: "group-hover:shadow-[0_0_40px_-8px_rgb(56_189_248/0.45)]",
      titleClass: "text-sky-400",
      icon: Trophy,
      description: t("rankedDesc"),
      badge: t("rankedBadge"),
    },
  ] as const;
  return (
    <section className={className}>
      <div className="mb-6">
        <p className="text-sm text-muted">{t("selectA")}</p>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground sm:text-3xl">
          <span className="text-gradient">{t("gameMode")}</span>
        </h2>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {modes.map((mode, i) => {
          const Icon = mode.icon;
          return (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link
                href={mode.href}
                className={cn(
                  "group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border glass-strong p-6 transition-all duration-300 hover:-translate-y-1 sm:min-h-[240px] sm:p-8",
                  mode.border,
                  mode.glow,
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-45",
                    mode.accent,
                  )}
                  aria-hidden
                />

                <div className="relative flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                        mode.accent,
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full glass-chip px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {mode.badge}
                    </span>
                  </div>

                  <h3
                    className={cn(
                      "mt-5 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl",
                      mode.titleClass,
                    )}
                  >
                    {mode.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                    {mode.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-foreground">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Play className="h-4 w-4" />
                    </span>
                    {t("playNow")}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
