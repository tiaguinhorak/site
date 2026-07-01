"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Crown,
  Medal,
  Search,
  TrendingUp,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { RankingBoardLabels } from "@/lib/ranking/ranking-board-labels";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { ProfileDisplayName } from "@/components/profile/profile-display-name";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { getCountryFlag } from "@/lib/profile";
import { EloRankBadgeI18n } from "@/components/ranked/elo-rank-badge-i18n";
import {
  LEADERBOARD_PAGE_SIZE,
  LEADERBOARD_SORT_VALUES,
  type LeaderboardPageResult,
  type LeaderboardPlayer,
  type LeaderboardSort,
} from "@/lib/leaderboard/types";
import { cn } from "@/lib/utils";
import type { PublicRankedSeasonOption } from "@/lib/ranked/season-service";
import type { PublicSeasonPrizeDisplay } from "@/lib/ranked/season-prize-display";
import { SeasonPrizesPanel } from "@/components/ranking/season-prizes-panel";
import { PixPrizeAlert } from "@/components/ranking/pix-prize-alert";

const rankAccent = ["text-amber-400", "text-zinc-300", "text-orange-400"];

function formatPaginationSummary(
  template: string,
  page: number,
  totalPages: number,
  count: number,
) {
  return template
    .replace(/\{page\}/g, String(page))
    .replace(/\{total\}/g, String(totalPages))
    .replace(/\{count\}/g, String(count));
}
const planStyles = {
  free: "bg-muted/20 text-muted",
  premium: "bg-primary/15 text-primary",
  elite: "badge-amber text-[10px] uppercase tracking-wide",
};

type RankingBoardProps = {
  initialData: LeaderboardPageResult;
  labels: RankingBoardLabels;
  seasons?: PublicRankedSeasonOption[];
  defaultSeasonId?: string | null;
  prizesBySeasonId?: Record<string, PublicSeasonPrizeDisplay[]>;
  variant?: "dashboard" | "marketing";
};

export function RankingBoard({
  initialData,
  labels,
  seasons = [],
  defaultSeasonId = null,
  prizesBySeasonId = {},
  variant = "dashboard",
}: RankingBoardProps) {
  const t = labels;
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<LeaderboardSort>(initialData.sort);
  const [page, setPage] = useState(initialData.page);
  const [seasonId, setSeasonId] = useState<string | null>(
    initialData.season?.id ?? defaultSeasonId,
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const userFiltersTouched = useRef(false);
  const inflightRef = useRef<AbortController | null>(null);
  const sortRef = useRef(sort);
  const seasonRef = useRef(seasonId);
  sortRef.current = sort;
  seasonRef.current = seasonId;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const loadPage = useCallback(
    async (
      nextPage: number,
      nextQuery: string,
      nextSort: LeaderboardSort,
      nextSeasonId: string | null = seasonRef.current,
    ) => {
      inflightRef.current?.abort();
      const controller = new AbortController();
      inflightRef.current = controller;

      setLoading(true);
      setLoadError(false);

      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(LEADERBOARD_PAGE_SIZE),
          sort: nextSort,
        });
        if (nextQuery) params.set("q", nextQuery);
        if (nextSeasonId) params.set("seasonId", nextSeasonId);

        const res = await fetch(`/api/leaderboard?${params.toString()}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          setLoadError(true);
          return;
        }

        const json = (await res.json()) as LeaderboardPageResult;
        if (controller.signal.aborted) return;

        setData(json);
        setPage(json.page);
        setSort(json.sort);
      } catch {
        if (!controller.signal.aborted) {
          setLoadError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!userFiltersTouched.current) return;
    void loadPage(1, debouncedQuery, sortRef.current, seasonRef.current);
  }, [debouncedQuery, loadPage]);

  function changeSort(nextSort: LeaderboardSort) {
    if (nextSort === sort) return;
    userFiltersTouched.current = true;
    setSort(nextSort);
    void loadPage(1, debouncedQuery, nextSort, seasonId);
  }

  function changeSeason(nextSeasonId: string | null) {
    userFiltersTouched.current = true;
    setSeasonId(nextSeasonId);
    void loadPage(1, debouncedQuery, sort, nextSeasonId);
  }

  function goToPage(next: number) {
    userFiltersTouched.current = true;
    const clamped = Math.min(totalPages, Math.max(1, next));
    void loadPage(clamped, debouncedQuery, sort, seasonId);
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      userFiltersTouched.current = false;
      setData(initialData);
      setPage(initialData.page);
      setSort(initialData.sort);
      setSeasonId(initialData.season?.id ?? defaultSeasonId);
      setLoadError(false);
      return;
    }
    userFiltersTouched.current = true;
  }

  const profileHref = (nickname: string) => `/player/${nickname}`;

  const showPodium =
    page === 1 && !debouncedQuery && sort === "points" && data.players.length >= 1;
  const isArchivedSeason = data.season?.archived === true;
  const availableSorts = data.availableSorts ?? LEADERBOARD_SORT_VALUES;
  const podium = showPodium ? data.players.slice(0, 3) : [];
  const podiumOrder = podium.length >= 3 ? [podium[1], podium[0], podium[2]] : podium;

  const sortOptions: { id: LeaderboardSort; label: string }[] = [
    { id: "points", label: t.sortPoints },
    { id: "elo", label: t.sortElo },
    { id: "kd", label: t.sortKd },
    { id: "wins", label: t.sortWins },
    { id: "winRate", label: t.sortWinRate },
    { id: "kills", label: t.sortKills },
    { id: "assists", label: t.sortAssists },
    { id: "mvps", label: t.sortMvps },
    { id: "hs", label: t.sortHs },
    { id: "clutch", label: t.sortClutch },
    { id: "utility", label: t.sortUtility },
    { id: "awp", label: t.sortAwp },
    { id: "level", label: t.sortLevel },
  ].filter((option): option is { id: LeaderboardSort; label: string } =>
    availableSorts.includes(option.id as LeaderboardSort),
  );

  const selectedSeason =
    seasons.find((season) => season.id === seasonId) ??
    (data.season
      ? {
          id: data.season.id,
          name: data.season.name,
          seasonNumber: data.season.seasonNumber,
          active: data.season.active,
          archived: data.season.archived,
        }
      : null);

  const selectedSeasonPrizes =
    seasonId && prizesBySeasonId[seasonId] ? prizesBySeasonId[seasonId]! : [];

  return (
    <div className="space-y-8 sm:space-y-10">
      {seasons.length > 0 && (
        <div className="flex flex-col gap-3 rounded-card glass border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.seasonLabel}</p>
            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {selectedSeason?.name ?? t.seasonCurrent}
            </p>
            {isArchivedSeason && (
              <p className="mt-1 text-sm text-muted">{t.seasonArchivedHint}</p>
            )}
          </div>
          <label className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[240px]">
            <span className="sr-only">{t.seasonSelectPlaceholder}</span>
            <select
              value={seasonId ?? ""}
              onChange={(event) => changeSeason(event.target.value || null)}
              disabled={loading}
              className="rounded-lg border border-border bg-background/80 px-3 py-2 text-sm text-foreground outline-none ring-primary/40 focus:ring-2"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.active ? ` (${t.seasonCurrent})` : season.archived ? ` (${t.seasonArchived})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <PixPrizeAlert />

      {selectedSeason && selectedSeasonPrizes.length > 0 && (
        <SeasonPrizesPanel
          seasonName={selectedSeason.name}
          archived={isArchivedSeason}
          prizes={selectedSeasonPrizes}
        />
      )}

      {loadError && (
        <p className="alert-warning px-4 py-3 text-sm">
          {t.loadError}
        </p>
      )}

      {data.you && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-card glass-strong border border-[color-mix(in_srgb,var(--primary)_22%,transparent)] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <UserProfileAvatar
                avatarUrl={data.you.avatarUrl}
                nickname={data.you.nickname}
                customization={data.you.customization}
                size="lg"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t.yourPosition}
                </p>
                <p className="font-display text-2xl font-bold text-foreground">
                  #{data.you.rank}{" "}
                  <span className="text-base font-semibold text-muted">
                    · {data.you.displayName}
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <StatPill label={t.colPoints} value={data.you.points.toLocaleString("pt-BR")} highlight />
              <div className="rounded-xl border border-border px-3 py-2 text-center sm:text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t.colElo}</p>
                <div className="mt-1 flex justify-center sm:justify-start">
                  <EloRankBadgeI18n elo={data.you.elo} size="sm" />
                </div>
              </div>
              <StatPill label={t.colKd} value={data.you.kd.toFixed(2)} />
              <StatPill label={t.colWinRate} value={`${data.you.winRate}%`} />
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-xl border border-border bg-[color-mix(in_srgb,var(--background)_80%,transparent)] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => changeSort(option.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                sort === option.id
                  ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-primary"
                  : "text-muted hover:text-foreground hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {showPodium && podium.length > 0 && (
        <div className="overflow-hidden rounded-card glass-strong border border-[color-mix(in_srgb,var(--primary)_18%,transparent)]">
          <div className="border-b border-border px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t.topSeason}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:items-end sm:gap-4 sm:p-5">
            {podiumOrder.map((player) => (
              <PodiumCard
                key={player.nickname}
                player={player}
                place={player.rank - 1}
                profileHref={profileHref(player.nickname)}
                labels={t}
                compact={player.rank !== 1}
              />
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-card glass">
        {data.players.length === 0 ? (
          <div className="p-12 text-center">
            <Medal className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-4 text-muted">{t.empty}</p>
            {variant === "dashboard" && (
              <div className="mt-6">
                <ButtonLink href="/dashboard/ranked" variant="primary" size="sm">
                  <Trophy className="h-4 w-4" />
                  {t.playRanked}
                </ButtonLink>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="hidden border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid md:grid-cols-[3rem_1fr_repeat(7,minmax(0,4rem))] md:gap-3">
              <span>#</span>
              <span>{t.colPlayer}</span>
              <span className="text-right">{t.colPoints}</span>
              <span className="text-right">{t.colElo}</span>
              <span className="text-right">{t.colKd}</span>
              <span className="text-right">{t.colKills}</span>
              <span className="text-right">{t.colWins}</span>
              <span className="text-right">{t.colWinRate}</span>
              <span className="text-right">{t.colMatches}</span>
            </div>
            <ul className={cn(loading && "pointer-events-none opacity-60")}>
              {data.players.map((player) => (
                <LeaderboardRow
                  key={`${player.rank}-${player.nickname}`}
                  player={player}
                  profileHref={profileHref(player.nickname)}
                  highlightYou={data.you?.nickname === player.nickname}
                  inPodium={showPodium && player.rank <= 3}
                  labels={t}
                />
              ))}
            </ul>
          </>
        )}

        {data.total > data.limit && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-4 sm:flex-row">
            <p className="text-sm text-muted">
              {formatPaginationSummary(t.paginationSummary, page, totalPages, data.total)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                {t.prev}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => goToPage(page + 1)}
              >
                {t.next}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border px-3 py-2 text-center sm:text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-display text-lg font-bold",
          highlight ? "text-gradient" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PodiumCard({
  player,
  place,
  profileHref,
  labels,
  compact = false,
}: {
  player: LeaderboardPlayer;
  place: number;
  profileHref: string;
  labels: RankingBoardLabels;
  compact?: boolean;
}) {
  const Icon = place === 0 ? Crown : Medal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place * 0.08 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-[color-mix(in_srgb,var(--background)_60%,transparent)] p-4",
        place === 0 &&
          "sm:-translate-y-1 border-amber-400/30 shadow-[0_0_32px_-12px_rgba(251,191,36,0.35)]",
        compact && "sm:opacity-95",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          place === 0 ? "badge-amber text-xs" : "bg-muted/15 text-muted",
        )}
      >
        <Icon className="h-3 w-3" />
        {place === 0 ? labels.topSeason : `#${player.rank}`}
      </span>
      <div className="mt-3 flex items-center gap-3">
        <UserProfileAvatar
          avatarUrl={player.avatarUrl}
          nickname={player.nickname}
          customization={player.customization}
          size={place === 0 ? "lg" : "md"}
        />
        <div className="min-w-0">
          <Link
            href={profileHref}
            prefetch={false}
            className={cn(
              "block truncate font-display font-bold text-foreground transition-colors hover:text-primary",
              place === 0 ? "text-lg" : "text-base",
            )}
          >
            <ProfileDisplayName
              nickname={player.nickname}
              displayName={player.displayName}
              plan={player.plan}
              customization={player.customization}
              nameClassName={cn(
                "font-display font-bold",
                place === 0 ? "text-lg" : "text-base",
              )}
              badgeSize="sm"
            />
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted">{getCountryFlag(player.country)}</span>
            <EloRankBadgeI18n elo={player.elo} size="sm" />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatPill label={labels.colPoints} value={player.points.toLocaleString("pt-BR")} highlight />
        <StatPill label={labels.colKd} value={player.kd.toFixed(2)} />
        <StatPill label={labels.colWinRate} value={`${player.winRate}%`} />
      </div>
    </motion.div>
  );
}

function LeaderboardRow({
  player,
  profileHref,
  highlightYou,
  inPodium,
  labels,
}: {
  player: LeaderboardPlayer;
  profileHref: string;
  highlightYou: boolean;
  inPodium?: boolean;
  labels: RankingBoardLabels;
}) {
  return (
    <li
      className={cn(
        "border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]",
        highlightYou && "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        inPodium && "bg-[color-mix(in_srgb,var(--amber-400)_6%,transparent)]",
      )}
    >
      <div className="flex items-center gap-3 md:grid md:grid-cols-[3rem_1fr_repeat(7,minmax(0,4rem))] md:items-center md:gap-3">
        <span
          className={cn(
            "w-8 text-center font-display text-lg font-bold md:w-auto",
            rankAccent[player.rank - 1] ?? "text-muted",
          )}
        >
          {player.rank}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-3 md:col-span-1">
          <UserProfileAvatar
            avatarUrl={player.avatarUrl}
            nickname={player.nickname}
            customization={player.customization}
            size="md"
          />
          <div className="min-w-0">
            <Link
              href={profileHref}
              prefetch={false}
              className="block truncate font-display text-sm font-semibold text-foreground hover:text-primary"
            >
              <ProfileDisplayName
                nickname={player.nickname}
                displayName={player.displayName}
                plan={player.plan}
                customization={player.customization}
                nameClassName="font-display text-sm font-semibold"
                badgeSize="sm"
              />
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{getCountryFlag(player.country)}</span>
            </div>
          </div>
        </div>

        <span className="hidden text-right font-mono text-sm font-semibold text-gradient md:block">
          {player.points.toLocaleString("pt-BR")}
        </span>
        <span className="hidden text-right md:block">
          <EloRankBadgeI18n elo={player.elo} size="sm" className="ml-auto" />
        </span>
        <span className="hidden items-center justify-end gap-1 text-sm text-muted md:flex">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          {player.kd.toFixed(2)}
        </span>
        <span className="hidden text-right text-sm text-foreground md:block">{player.kills}</span>
        <span className="hidden text-right text-sm text-foreground md:block">{player.wins}</span>
        <span className="hidden text-right text-sm text-foreground md:block">
          {player.winRate}%
        </span>
        <span className="hidden text-right text-sm text-muted md:block">{player.matches}</span>

        <div className="ml-auto flex shrink-0 items-center gap-3 text-xs text-muted md:hidden">
          <span className="font-mono font-semibold text-foreground">
            {player.points.toLocaleString("pt-BR")} pts
          </span>
          <span>
            {player.kills}K · {player.kd.toFixed(2)} KD
          </span>
        </div>
      </div>
    </li>
  );
}
