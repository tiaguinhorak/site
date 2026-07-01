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
import { ProfileCustomizationHero } from "@/components/profile/profile-customization-hero";
import { ProfileDisplayName } from "@/components/profile/profile-display-name";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { PlanBadgeDisplay } from "@/components/profile/plan-badge";
import { EloRankBadge } from "@/components/ranked/elo-rank-badge";
import type { PublicPlayerProfile } from "@/lib/profile/serialize-public";
import type { PublicProfileLabels } from "@/lib/profile/public-profile-labels.shared";
import { formatPublicProfileBadge } from "@/lib/profile/public-profile-labels.shared";
import { cn } from "@/lib/utils";

export function PublicProfileView({
  player,
  labels,
}: {
  player: PublicPlayerProfile;
  labels: PublicProfileLabels;
}) {
  const custom = player.customization;
  const planLabel =
    player.plan === "elite"
      ? labels.planElite
      : player.plan === "premium"
        ? labels.planPremium
        : labels.planFree;
  const rankBadgeText = formatPublicProfileBadge(labels.rankBadgeTemplate, {
    rank: player.rank,
  });
  const levelBadgeText = formatPublicProfileBadge(labels.levelBadgeTemplate, {
    level: player.level,
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ProfileCustomizationHero customization={custom} ownerPreview={false} priority>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <UserProfileAvatar
              avatarUrl={player.avatarUrl}
              nickname={player.nickname}
              customization={custom}
              size="lg"
              priority
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <ProfileDisplayName
                  nickname={player.nickname}
                  displayName={player.displayName}
                  plan={player.plan}
                  customization={custom}
                  planLabel={planLabel}
                  nameClassName="font-display text-3xl font-bold text-foreground sm:text-4xl"
                  badgeSize="md"
                />
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
                <p className="mt-4 text-sm text-muted">{labels.noBio}</p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-sm font-medium text-foreground"
                  data-profile-accent-bg
                >
                  <Trophy className="h-4 w-4 text-primary" data-profile-accent />
                  {rankBadgeText}
                </span>
                <EloRankBadge
                  elo={player.elo}
                  rankName={player.eloRankName}
                  groupName={player.eloGroupName}
                  size="md"
                />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-sm font-medium text-foreground">
                  {levelBadgeText}
                </span>
                <PublicProfileShareButton
                  nickname={player.nickname}
                  labels={{
                    shareProfile: labels.shareProfile,
                    shareCopied: labels.shareCopied,
                    shareCopiedShort: labels.shareCopiedShort,
                    shareFailed: labels.shareFailed,
                  }}
                />
                {player.anticheatInstalled && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    {labels.anticheatVerified}
                  </span>
                )}
              </div>
            </div>
          </div>
        </ProfileCustomizationHero>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-card glass-strong p-6 sm:p-8"
      >
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
          {labels.statsTitle}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: labels.kd, value: player.kd.toFixed(2), icon: Target },
            { label: labels.matches, value: player.matches, icon: Medal },
            { label: labels.winRate, value: `${player.winRate}%`, icon: TrendingUp },
            {
              label: labels.record,
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
            <p className="text-xs uppercase tracking-wider text-muted">{labels.globalPosition}</p>
            <p className="mt-2 font-display text-4xl font-bold text-gradient">
              {player.rank > 0 ? `#${player.rank}` : "—"}
            </p>
            <p className="mt-1 text-sm text-muted">{labels.currentSeason}</p>
          </div>
          <div className="rounded-xl glass p-5">
            <p className="text-xs uppercase tracking-wider text-muted">{labels.eloRating}</p>
            <div className="mt-3">
              <EloRankBadge
                elo={player.elo}
                rankName={player.eloRankName}
                groupName={player.eloGroupName}
                size="lg"
                showNumeric
              />
            </div>
            <p className="mt-2 text-sm text-muted">{labels.eloLabel}</p>
          </div>
          <div className="rounded-xl glass p-5">
            <p className="text-xs uppercase tracking-wider text-muted">{labels.competitiveScore}</p>
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
          {labels.advancedStatsTitle}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { label: labels.hsPct, value: `${player.hsPct}%`, icon: Crosshair },
            { label: labels.adr, value: player.adr.toFixed(1), icon: Flame },
            { label: labels.mvps, value: player.rankedMvps, icon: Trophy },
            { label: labels.clutches, value: player.rankedClutches, icon: Zap },
            { label: labels.awpKills, value: player.rankedAwpKills, icon: Target },
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
            <p className="text-xs uppercase tracking-wider text-muted">{labels.favoriteWeapon}</p>
            <p className="mt-2 font-display text-lg font-bold text-foreground">
              {player.favoriteWeapon ?? labels.notAvailable}
            </p>
          </div>
          <div className="rounded-xl glass p-4">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
              <MapPin className="h-3.5 w-3.5" />
              {labels.favoriteMap}
            </p>
            <p className="mt-2 font-display text-lg font-bold text-foreground">
              {player.favoriteMap ?? labels.notAvailable}
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
              <p className="font-display text-sm font-bold text-foreground">{labels.plan}</p>
              <p className="text-sm text-muted">
                <PlanBadgeDisplay plan={player.plan} label={planLabel} size="sm" />
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3 border-t border-border pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{labels.anticheat}</span>
              <span
                className={cn(
                  "font-medium",
                  player.anticheatInstalled ? "text-emerald-400" : "text-muted",
                )}
              >
                {player.anticheatInstalled ? labels.installed : labels.notDetected}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{labels.country}</span>
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
              <p className="font-display text-sm font-bold text-foreground">{labels.steam}</p>
              <p className="text-sm text-muted">
                {player.steamPersonaName ? labels.linkedAccount : labels.notLinked}
              </p>
            </div>
          </div>
          {player.steamPersonaName && (
            <div className="mt-5 space-y-3 border-t border-border pt-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted">{labels.persona}</span>
                <span className="font-medium text-foreground text-right">
                  {player.steamPersonaName}
                </span>
              </div>
              {player.steamProfileUrl && (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted">{labels.profile}</span>
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
