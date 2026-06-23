"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Crown, TrendingUp, Medal, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { SteamIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { cn } from "@/lib/utils";

export type LeaderboardPlayerView = {
  rank: number;
  name: string;
  kd: number;
  points: number;
};

const rankAccent = ["text-amber-400", "text-zinc-300", "text-orange-400"];

export function Leaderboard({
  embedded = false,
  leaderboard,
}: {
  embedded?: boolean;
  leaderboard: LeaderboardPlayerView[];
}) {
  const t = useTranslations("marketing");
  const { authenticated, steamLinked } = useAuthSession();
  const top = leaderboard[0];
  const rest = top ? leaderboard.slice(1) : [];

  if (!top) {
    return (
      <section
        id={embedded ? undefined : "ranking"}
        className={cn(embedded ? "" : "relative scroll-mt-24 py-24")}
      >
        <div className={cn(embedded ? "" : "mx-auto max-w-6xl px-4 sm:px-6")}>
          {!embedded && (
            <SectionHeading
              eyebrow={t("rankingEyebrow")}
              title={
                <>
                  {t("rankingTitleA")}{" "}
                  <span className="text-gradient">{t("rankingTitleB")}</span> {t("rankingTitleC")}
                </>
              }
              description={t("rankingDesc")}
            />
          )}
          <div
            className={cn(
              "rounded-card glass border border-border p-10 text-center",
              !embedded && "mt-12",
            )}
          >
            <Medal className="mx-auto h-10 w-10 text-muted" aria-hidden />
            <p className="mt-4 text-muted">{t("leaderboardEmpty")}</p>
            <div className="mt-6 flex justify-center">
              {authenticated ? (
                <ButtonLink href="/dashboard/ranked" variant="primary" size="sm">
                  {t("viewDashboard")}
                </ButtonLink>
              ) : (
                <ButtonLink href="/login" variant="primary" size="sm">
                  {t("loginForRank")}
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={embedded ? undefined : "ranking"}
      className={cn(embedded ? "" : "relative scroll-mt-24 py-24")}
    >
      <div className={cn(embedded ? "" : "mx-auto max-w-6xl px-4 sm:px-6")}>
        {!embedded && (
          <SectionHeading
            eyebrow={t("rankingEyebrow")}
            title={
              <>
                {t("rankingTitleA")} <span className="text-gradient">{t("rankingTitleB")}</span> {t("rankingTitleC")}
              </>
            }
            description={t("rankingDesc")}
          />
        )}

        <div
          className={cn(
            "grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-8",
            !embedded && "mt-12",
          )}
        >
          {/* Featured #1 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-card glass-strong border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] p-6 shadow-[0_0_48px_-16px_var(--glow-1)] sm:p-8"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-50 blur-3xl"
              style={{ background: "var(--glow-1)" }}
              aria-hidden
            />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <Crown className="h-3.5 w-3.5" />
                {t("topSeason")}
              </span>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] font-display text-2xl font-bold text-white shadow-lg">
                  {top.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display text-3xl font-bold text-foreground">
                    <Link href={`/player/${top.name}`} className="hover:text-primary transition-colors">
                      {top.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted">{t("playerNo1")}</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    {t("kdRatio")}
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold text-foreground">
                    {top.kd.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    {t("points")}
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold text-gradient">
                    {top.points.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* List */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-card glass"
          >
            <ul>
              {rest.map((player) => (
                <li
                  key={player.rank}
                  className="flex items-center gap-4 border-b border-border px-5 py-3.5 transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--primary)_7%,transparent)]"
                >
                  <span
                    className={cn(
                      "w-7 text-center font-display text-lg font-bold",
                      rankAccent[player.rank - 1] ?? "text-muted",
                    )}
                  >
                    {player.rank}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] font-display text-sm font-bold text-primary">
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <Link
                    href={`/player/${player.name}`}
                    className="flex-1 font-display text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {player.name}
                  </Link>
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    {player.kd.toFixed(2)}
                  </span>
                  <span className="w-20 text-right font-mono text-sm font-semibold text-foreground">
                    {player.points.toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-5 sm:flex-row">
              <p className="flex items-center gap-2 text-sm text-muted">
                <Medal className="h-4 w-4 text-primary" />
                {t("yourPosition")} <span className="text-foreground">#—</span>
              </p>
              {authenticated ? (
                steamLinked ? (
                  <ButtonLink href="/dashboard" variant="primary" size="sm">
                    <LayoutDashboard className="h-4 w-4" />
                    {t("viewDashboard")}
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/api/auth/steam?mode=link" variant="primary" size="sm">
                    <SteamIcon className="h-4 w-4" />
                    {t("linkSteam")}
                  </ButtonLink>
                )
              ) : (
                <ButtonLink href="/login" variant="primary" size="sm">
                  <SteamIcon className="h-4 w-4" />
                  {t("loginForRank")}
                </ButtonLink>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
