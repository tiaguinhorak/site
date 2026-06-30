"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Trophy,
  Target,
  ShieldCheck,
  Crown,
  ExternalLink,
  Medal,
  TrendingUp,
  Crosshair,
  Flame,
  Zap,
  MapPin,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/ui/icons";
import { PublicProfileShareButton } from "@/components/profile/public-profile-share-button";
import type { PublicPlayerProfile } from "@/lib/profile/serialize-public";
import { cn } from "@/lib/utils";

const planBadge = {
  free: "bg-muted/20 text-muted",
  premium: "bg-primary/20 text-primary",
  elite: "bg-amber-500/20 text-amber-400",
};

const planLabels = {
  free: "Free",
  premium: "Premium",
  elite: "Elite",
};

export function PublicProfileView({ player }: { player: PublicPlayerProfile }) {
  const t = useTranslations("publicProfile");
  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-card glass-strong"
      >
        <div className="relative p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
            style={{ background: "var(--glow-1)" }}
            aria-hidden
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] font-display text-4xl font-bold text-white shadow-lg ring-2 ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
              {player.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                player.nickname.slice(0, 2)
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                  {player.nickname}
                </h1>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                    planBadge[player.plan],
                  )}
                >
                  {planLabels[player.plan]}
                </span>
                {player.profileTag ? (
                  <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-violet-300">
                    [{player.profileTag}]
                  </span>
                ) : null}
              </div>

              <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                <span className="text-xl leading-none">{player.countryFlag}</span>
                <span>{player.countryName}</span>
              </p>

              {player.bio ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/90">
                  {player.bio}
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted">{t("noBio")}</p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-sm font-medium text-foreground">
                  <Trophy className="h-4 w-4 text-primary" />
                  {t("rankBadge", { rank: player.rank })}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-sm font-medium text-foreground">
                  <Medal className="h-4 w-4 text-primary" />
                  {player.elo} ELO
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-sm font-medium text-foreground">
                  {t("levelBadge", { level: player.level })}
                </span>
                <PublicProfileShareButton nickname={player.nickname} />
                {player.anticheatInstalled && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    {t("anticheatVerified")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-card glass-strong p-6 sm:p-8"
      >
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
          {t("statsTitle")}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t("kd"), value: player.kd.toFixed(2), icon: Target },
            { label: t("matches"), value: player.matches, icon: Medal },
            { label: t("winRate"), value: `${player.winRate}%`, icon: TrendingUp },
            {
              label: t("record"),
              value: `${player.rankedWins}W / ${player.rankedLosses}L`,
              icon: Trophy,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl glass p-4"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {stat.label}
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl glass p-5">
            <p className="text-xs uppercase tracking-wider text-muted">{t("globalPosition")}</p>
            <p className="mt-2 font-display text-4xl font-bold text-gradient">
              {player.rank > 0 ? `#${player.rank}` : "—"}
            </p>
            <p className="mt-1 text-sm text-muted">{t("currentSeason")}</p>
          </div>
          <div className="rounded-xl glass p-5">
            <p className="text-xs uppercase tracking-wider text-muted">{t("eloRating")}</p>
            <p className="mt-2 font-display text-4xl font-bold text-foreground">
              {player.elo}
            </p>
            <p className="mt-1 text-sm text-muted">{t("eloLabel")}</p>
          </div>
          <div className="rounded-xl glass p-5">
            <p className="text-xs uppercase tracking-wider text-muted">{t("competitiveScore")}</p>
            <p className="mt-2 font-display text-4xl font-bold text-gradient">
              {player.competitivePoints.toLocaleString("pt-BR")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {player.rankedKills}K / {player.rankedDeaths}D / {player.rankedAssists}A
            </p>
          </div>
        </div>
      </motion.div>

      {/* Advanced competitive stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="rounded-card glass-strong p-6 sm:p-8"
      >
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
          {t("advancedStatsTitle")}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { label: t("hsPct"), value: `${player.hsPct}%`, icon: Crosshair },
            { label: t("adr"), value: player.adr.toFixed(1), icon: Flame },
            { label: t("mvps"), value: player.rankedMvps, icon: Trophy },
            { label: t("clutches"), value: player.rankedClutches, icon: Zap },
            { label: t("awpKills"), value: player.rankedAwpKills, icon: Target },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl glass p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {stat.label}
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl glass p-4">
            <p className="text-xs uppercase tracking-wider text-muted">{t("favoriteWeapon")}</p>
            <p className="mt-2 font-display text-lg font-bold text-foreground">
              {player.favoriteWeapon ?? t("notAvailable")}
            </p>
          </div>
          <div className="rounded-xl glass p-4">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
              <MapPin className="h-3.5 w-3.5" />
              {t("favoriteMap")}
            </p>
            <p className="mt-2 font-display text-lg font-bold text-foreground">
              {player.favoriteMap ?? t("notAvailable")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Plataforma + Steam */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="rounded-card glass p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">{t("plan")}</p>
              <p className="text-sm text-muted">{planLabels[player.plan]}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 border-t border-border pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("anticheat")}</span>
              <span
                className={cn(
                  "font-medium",
                  player.anticheatInstalled ? "text-emerald-400" : "text-muted",
                )}
              >
                {player.anticheatInstalled ? t("installed") : t("notDetected")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("country")}</span>
              <span className="font-medium text-foreground">
                {player.countryFlag} {player.countryName}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-card glass p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171a21] text-white ring-1 ring-border">
              <SteamIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">{t("steam")}</p>
              <p className="text-sm text-muted">
                {player.steamPersonaName ? t("linkedAccount") : t("notLinked")}
              </p>
            </div>
          </div>
          {player.steamPersonaName && (
            <div className="mt-5 space-y-3 border-t border-border pt-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted">{t("persona")}</span>
                <span className="font-medium text-foreground text-right">
                  {player.steamPersonaName}
                </span>
              </div>
              {player.steamProfileUrl && (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted">{t("profile")}</span>
                  <Link
                    href={player.steamProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                  >
                    <SteamIcon className="h-3.5 w-3.5" />
                    steamcommunity.com
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
