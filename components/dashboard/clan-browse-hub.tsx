"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Crown,
  Eye,
  Loader2,
  Lock,
  Search,
  Swords,
  Trophy,
  Unlock,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AvatarImage } from "@/components/ui/avatar-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EloRankBadgeI18n } from "@/components/ranked/elo-rank-badge-i18n";
import { SocialUserRow } from "@/components/social/social-user-row";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import type { SerializedSocialUser } from "@/lib/profile/social-user";
import { cn } from "@/lib/utils";

export type ClanBrowseEntry = {
  id: string;
  tag: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  joinMode: "OPEN" | "CLOSED";
  rank: number;
  memberCount: number;
  totalPoints: number;
  totalXp: number;
  totalKills: number;
  totalWins: number;
  totalMvps: number;
  avgElo: number;
  leader: ClanLeaderPreview | null;
};

type ClanLeaderPreview = SerializedSocialUser;

type SortKey = "points" | "elo" | "members" | "wins";
type JoinFilter = "ALL" | "OPEN" | "CLOSED";

export function ClanBrowseHub({
  ranking,
  topClan,
  myClanId,
  busy,
  onSearch,
  onJoin,
  onView,
  onCompare,
}: {
  ranking: ClanBrowseEntry[];
  topClan: ClanBrowseEntry | null;
  myClanId: string | null;
  busy: boolean;
  onSearch: (params: { q: string; sort: SortKey; joinMode: JoinFilter }) => void;
  onJoin: (clanId: string) => void;
  onView: (clanId: string) => void;
  onCompare: (clanId: string) => void;
}) {
  const t = useTranslations("clans");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("points");
  const [joinMode, setJoinMode] = useState<JoinFilter>("ALL");

  const sortOptions: { key: SortKey; label: string }[] = useMemo(
    () => [
      { key: "points", label: t("sortPoints") },
      { key: "elo", label: t("sortElo") },
      { key: "members", label: t("sortMembers") },
      { key: "wins", label: t("sortWins") },
    ],
    [t],
  );

  function applyFilters(next?: Partial<{ q: string; sort: SortKey; joinMode: JoinFilter }>) {
    const params = {
      q: next?.q ?? query,
      sort: next?.sort ?? sort,
      joinMode: next?.joinMode ?? joinMode,
    };
    onSearch(params);
  }

  return (
    <div className="space-y-6">
      {topClan && (
        <div className="relative overflow-hidden rounded-card glass-strong border border-amber-400/25 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-400/40 sm:h-20 sm:w-20">
                <AvatarImage
                  src={topClan.avatarUrl ?? getDefaultAvatarPresetUrl()}
                  alt=""
                  size={80}
                />
                <span className="absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full badge-amber shadow-lg">
                  <Crown className="h-4 w-4" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  {t("topClanBadge")}
                </p>
                <p className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
                  <span className="text-primary">[{topClan.tag}]</span> {topClan.name}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {topClan.totalPoints.toLocaleString("pt-BR")} {t("points")} ·{" "}
                  {t("memberCount", { count: topClan.memberCount })} ·{" "}
                  <EloRankBadgeI18n elo={topClan.avgElo} size="sm" />
                </p>
                {topClan.leader && (
                  <div className="mt-3 max-w-md">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t("leaderLabel")}
                    </p>
                    <SocialUserRow user={topClan.leader} link showPlanBadge />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onView(topClan.id)}>
                <Eye className="h-4 w-4" />
                {t("viewClan")}
              </Button>
              {myClanId && myClanId !== topClan.id && (
                <Button type="button" variant="primary" size="sm" onClick={() => onCompare(topClan.id)}>
                  <ArrowLeftRight className="h-4 w-4" />
                  {t("compare")}
                </Button>
              )}
              {!myClanId && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  onClick={() => onJoin(topClan.id)}
                >
                  {topClan.joinMode === "CLOSED" ? t("requestJoin") : t("join")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-card glass p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Input
              label={t("searchLabel")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              icon={<Search className="h-4 w-4" />}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
            />
          </div>
          <Button type="button" variant="primary" onClick={() => applyFilters()}>
            {t("searchButton")}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setSort(opt.key);
                applyFilters({ sort: opt.key });
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                sort === opt.key
                  ? "bg-primary/15 text-primary"
                  : "border border-border text-muted hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["ALL", "OPEN", "CLOSED"] as JoinFilter[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setJoinMode(mode);
                applyFilters({ joinMode: mode });
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                joinMode === mode
                  ? "bg-primary/15 text-primary"
                  : "border border-border text-muted hover:text-foreground",
              )}
            >
              {mode === "OPEN" && <Unlock className="h-3.5 w-3.5" />}
              {mode === "CLOSED" && <Lock className="h-3.5 w-3.5" />}
              {mode === "ALL" ? t("filterAll") : mode === "OPEN" ? t("joinModeOpen") : t("joinModeClosed")}
            </button>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <Trophy className="h-5 w-5 text-primary" />
          {t("rankingTitle")}
          <span className="text-sm font-normal text-muted">({ranking.length})</span>
        </h2>

        {ranking.length === 0 ? (
          <div className="rounded-card glass p-8 text-center text-muted">{t("noClansFound")}</div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {ranking.map((clan) => (
              <li
                key={clan.id}
                className={cn(
                  "rounded-card glass p-4 transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]",
                  clan.rank === 1 && "ring-1 ring-amber-400/30",
                  myClanId === clan.id && "ring-1 ring-primary/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1 w-7 shrink-0 text-center font-display text-lg font-bold",
                      clan.rank === 1
                        ? "text-amber-400"
                        : clan.rank === 2
                          ? "text-zinc-300"
                          : clan.rank === 3
                            ? "text-orange-400"
                            : "text-muted",
                    )}
                  >
                    {clan.rank}
                  </span>
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border">
                    <AvatarImage src={clan.avatarUrl ?? getDefaultAvatarPresetUrl()} alt="" size={48} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-foreground">
                      <span className="text-primary">[{clan.tag}]</span> {clan.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted line-clamp-2">
                      {clan.description || t("noDescription")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span>{t("memberCount", { count: clan.memberCount })}</span>
                      <span>·</span>
                      <EloRankBadgeI18n elo={clan.avgElo} size="sm" />
                      <span>·</span>
                      <span className="font-mono font-semibold text-gradient">
                        {clan.totalPoints.toLocaleString("pt-BR")} {t("pointsShort")}
                      </span>
                      {clan.joinMode === "OPEN" ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-400">
                          <Unlock className="h-3 w-3" /> {t("joinModeOpen")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-amber-300">
                          <Lock className="h-3 w-3" /> {t("joinModeClosed")}
                        </span>
                      )}
                    </div>
                    {clan.leader && (
                      <div className="mt-2">
                        <SocialUserRow user={clan.leader} link nameClassName="text-xs" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                  <Button type="button" size="sm" variant="outline" onClick={() => onView(clan.id)}>
                    <Eye className="h-3.5 w-3.5" />
                    {t("viewClan")}
                  </Button>
                  {myClanId && myClanId !== clan.id && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => onCompare(clan.id)}>
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      {t("compare")}
                    </Button>
                  )}
                  {!myClanId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={busy}
                      onClick={() => onJoin(clan.id)}
                    >
                      <Swords className="h-3.5 w-3.5" />
                      {clan.joinMode === "CLOSED" ? t("requestJoin") : t("join")}
                    </Button>
                  )}
                  {myClanId === clan.id && (
                    <span className="inline-flex items-center gap-1 self-center text-xs font-semibold text-primary">
                      <Users className="h-3.5 w-3.5" />
                      {t("yourClan")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
