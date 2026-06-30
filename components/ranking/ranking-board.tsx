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
import { useTranslations } from "next-intl";
import { AvatarImage } from "@/components/ui/avatar-image";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { getCountryFlag } from "@/lib/profile";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import {
  LEADERBOARD_PAGE_SIZE,
  type LeaderboardPageResult,
  type LeaderboardPlayer,
  type LeaderboardSort,
} from "@/lib/leaderboard/types";
import { cn } from "@/lib/utils";

const rankAccent = ["text-amber-400", "text-zinc-300", "text-orange-400"];
const planStyles = {
  free: "bg-muted/20 text-muted",
  premium: "bg-primary/15 text-primary",
  elite: "bg-amber-500/15 text-amber-400",
};

type RankingBoardProps = {
  initialData: LeaderboardPageResult;
  variant?: "dashboard" | "marketing";
};

export function RankingBoard({ initialData, variant = "dashboard" }: RankingBoardProps) {
  const t = useTranslations("ranking");
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<LeaderboardSort>(initialData.sort);
  const [page, setPage] = useState(initialData.page);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const skipSearchFetch = useRef(true);
  const inflightRef = useRef<AbortController | null>(null);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const loadPage = useCallback(
    async (nextPage: number, nextQuery: string, nextSort: LeaderboardSort) => {
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
    if (skipSearchFetch.current) {
      skipSearchFetch.current = false;
      return;
    }
    void loadPage(1, debouncedQuery, sortRef.current);
  }, [debouncedQuery, loadPage]);

  function changeSort(nextSort: LeaderboardSort) {
    if (nextSort === sort) return;
    setSort(nextSort);
    void loadPage(1, debouncedQuery, nextSort);
  }

  function goToPage(next: number) {
    const clamped = Math.min(totalPages, Math.max(1, next));
    void loadPage(clamped, debouncedQuery, sort);
  }

  const profileHref = (nickname: string) => `/player/${nickname}`;

  const showPodium =
    page === 1 && !debouncedQuery && sort === "points" && data.players.length >= 1;
  const podium = showPodium ? data.players.slice(0, 3) : [];
  const tablePlayers = showPodium ? data.players.slice(3) : data.players;

  const sortOptions: { id: LeaderboardSort; label: string }[] = [
    { id: "points", label: t("sortPoints") },
    { id: "elo", label: t("sortElo") },
    { id: "kd", label: t("sortKd") },
    { id: "wins", label: t("sortWins") },
    { id: "winRate", label: t("sortWinRate") },
    { id: "kills", label: t("sortKills") },
    { id: "assists", label: t("sortAssists") },
    { id: "mvps", label: t("sortMvps") },
    { id: "hs", label: t("sortHs") },
    { id: "clutch", label: t("sortClutch") },
    { id: "utility", label: t("sortUtility") },
    { id: "awp", label: t("sortAwp") },
    { id: "level", label: t("sortLevel") },
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      {loadError && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {t("loadError")}
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
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
                {data.you.avatarUrl ? (
                  <AvatarImage src={data.you.avatarUrl} alt="" size={56} />
                ) : (
                  <span className="font-display text-lg font-bold text-primary">
                    {data.you.nickname.slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("yourPosition")}
                </p>
                <p className="font-display text-2xl font-bold text-foreground">
                  #{data.you.rank}{" "}
                  <span className="text-base font-semibold text-muted">
                    · {data.you.nickname}
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <StatPill label={t("colPoints")} value={data.you.points.toLocaleString("pt-BR")} highlight />
              <StatPill label={t("colElo")} value={String(data.you.elo)} />
              <StatPill label={t("colKd")} value={data.you.kd.toFixed(2)} />
              <StatPill label={t("colWinRate")} value={`${data.you.winRate}%`} />
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {podium.map((player, index) => (
            <PodiumCard
              key={player.nickname}
              player={player}
              place={index}
              profileHref={profileHref(player.nickname)}
              t={t}
            />
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-card glass">
        {data.players.length === 0 ? (
          <div className="p-12 text-center">
            <Medal className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-4 text-muted">{t("empty")}</p>
            {variant === "dashboard" && (
              <div className="mt-6">
                <ButtonLink href="/dashboard/ranked" variant="primary" size="sm">
                  <Trophy className="h-4 w-4" />
                  {t("playRanked")}
                </ButtonLink>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="hidden border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid md:grid-cols-[3rem_1fr_repeat(7,minmax(0,4rem))] md:gap-3">
              <span>#</span>
              <span>{t("colPlayer")}</span>
              <span className="text-right">{t("colPoints")}</span>
              <span className="text-right">{t("colElo")}</span>
              <span className="text-right">{t("colKd")}</span>
              <span className="text-right">{t("colKills")}</span>
              <span className="text-right">{t("colWins")}</span>
              <span className="text-right">{t("colWinRate")}</span>
              <span className="text-right">{t("colMatches")}</span>
            </div>
            <ul className={cn(loading && "pointer-events-none opacity-60")}>
              {tablePlayers.map((player) => (
                <LeaderboardRow
                  key={`${player.rank}-${player.nickname}`}
                  player={player}
                  profileHref={profileHref(player.nickname)}
                  highlightYou={data.you?.nickname === player.nickname}
                  t={t}
                />
              ))}
            </ul>
          </>
        )}

        {data.total > data.limit && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-4 sm:flex-row">
            <p className="text-sm text-muted">
              {t("paginationSummary", {
                page,
                total: totalPages,
                count: data.total,
              })}
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
                {t("prev")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => goToPage(page + 1)}
              >
                {t("next")}
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
  t,
}: {
  player: LeaderboardPlayer;
  place: number;
  profileHref: string;
  t: ReturnType<typeof useTranslations<"ranking">>;
}) {
  const Icon = place === 0 ? Crown : Medal;
  const avatar = player.avatarUrl ?? getDefaultAvatarPresetUrl();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place * 0.08 }}
      className={cn(
        "relative overflow-hidden rounded-card glass p-5 sm:p-6",
        place === 0 &&
          "border border-amber-400/25 shadow-[0_0_40px_-12px_rgba(251,191,36,0.35)]",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
          place === 0 ? "bg-amber-400/15 text-amber-400" : "bg-muted/15 text-muted",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {place === 0 ? t("topSeason") : `#${player.rank}`}
      </span>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-14 w-14 overflow-hidden rounded-2xl border border-border">
          <AvatarImage src={avatar} alt="" size={56} />
        </div>
        <div className="min-w-0">
          <Link
            href={profileHref}
            prefetch={false}
            className="font-display text-xl font-bold text-foreground transition-colors hover:text-primary"
          >
            {player.nickname}
          </Link>
          <p className="text-sm text-muted">
            {getCountryFlag(player.country)} {t("colElo")} {player.elo}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <StatPill label={t("colPoints")} value={player.points.toLocaleString("pt-BR")} highlight />
        <StatPill label={t("colKd")} value={player.kd.toFixed(2)} />
        <StatPill label={t("colWinRate")} value={`${player.winRate}%`} />
      </div>
    </motion.div>
  );
}

function LeaderboardRow({
  player,
  profileHref,
  highlightYou,
  t,
}: {
  player: LeaderboardPlayer;
  profileHref: string;
  highlightYou: boolean;
  t: ReturnType<typeof useTranslations<"ranking">>;
}) {
  const avatar = player.avatarUrl ?? getDefaultAvatarPresetUrl();

  return (
    <li
      className={cn(
        "border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]",
        highlightYou && "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
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
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border">
            <AvatarImage src={avatar} alt="" size={40} />
          </div>
          <div className="min-w-0">
            <Link
              href={profileHref}
              prefetch={false}
              className="truncate font-display text-sm font-semibold text-foreground hover:text-primary"
            >
              {player.nickname}
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{getCountryFlag(player.country)}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                  planStyles[player.plan],
                )}
              >
                {player.plan}
              </span>
            </div>
          </div>
        </div>

        <span className="hidden text-right font-mono text-sm font-semibold text-gradient md:block">
          {player.points.toLocaleString("pt-BR")}
        </span>
        <span className="hidden text-right text-sm text-foreground md:block">{player.elo}</span>
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
