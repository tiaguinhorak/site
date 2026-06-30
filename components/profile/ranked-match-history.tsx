"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { RankedMatchHistoryEntry } from "@/lib/leaderboard/types";
import { cn } from "@/lib/utils";

type RankedMatchHistoryProps = {
  nickname: string;
};

export function RankedMatchHistory({ nickname }: RankedMatchHistoryProps) {
  const t = useTranslations("publicProfile");
  const [history, setHistory] = useState<RankedMatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/players/${encodeURIComponent(nickname)}/ranked-history`, {
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : { history: [] }))
      .then((data) => {
        if (!cancelled) setHistory(data.history ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nickname]);

  if (loading) {
    return (
      <div className="rounded-card glass-strong p-6 text-sm text-muted">
        {t("historyLoading")}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-card glass-strong p-6 text-sm text-muted">
        {t("historyEmpty")}
      </div>
    );
  }

  return (
    <div className="rounded-card glass-strong p-6 sm:p-8">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
        {t("historyTitle")}
      </h2>
      <ul className="mt-4 divide-y divide-border">
        {history.map((match) => (
          <li
            key={match.id}
            className="first:pt-0 last:pb-0"
          >
            <Link
              href={`/dashboard/partidas/${match.sessionId}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg py-3 transition-colors hover:bg-white/5"
            >
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-foreground">
                {match.map ?? t("unknownMap")}
              </p>
              <p className="text-xs text-muted">
                {match.finishedAt
                  ? new Date(match.finishedAt).toLocaleString()
                  : t("dateUnknown")}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase",
                  match.won
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400",
                )}
              >
                {match.won ? t("win") : t("loss")}
              </span>
              {match.scoreTeamA != null && match.scoreTeamB != null && (
                <span className="font-mono text-muted">
                  {match.scoreTeamA}:{match.scoreTeamB}
                </span>
              )}
              <span className="text-muted">
                {match.kills}/{match.deaths}/{match.assists}
              </span>
            </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
