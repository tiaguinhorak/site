"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Activity, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RankedMatchHistoryEntry } from "@/lib/leaderboard/types";
import { cn } from "@/lib/utils";

type PerformanceChartProps = {
  nickname: string;
};

type Point = {
  index: number;
  kd: number;
  kills: number;
  won: boolean;
};

const WIDTH = 640;
const HEIGHT = 180;
const PAD_X = 8;
const PAD_Y = 16;

function buildPath(points: Point[], maxKd: number): { line: string; area: string } {
  if (points.length === 0) return { line: "", area: "" };
  const n = points.length;
  const usableW = WIDTH - PAD_X * 2;
  const usableH = HEIGHT - PAD_Y * 2;
  const stepX = n > 1 ? usableW / (n - 1) : 0;

  const coords = points.map((p, i) => {
    const x = PAD_X + (n > 1 ? i * stepX : usableW / 2);
    const ratio = maxKd > 0 ? p.kd / maxKd : 0;
    const y = PAD_Y + usableH - ratio * usableH;
    return { x, y };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const area =
    `${line} L${coords[coords.length - 1].x.toFixed(1)},${(HEIGHT - PAD_Y).toFixed(1)}` +
    ` L${coords[0].x.toFixed(1)},${(HEIGHT - PAD_Y).toFixed(1)} Z`;

  return { line, area };
}

export function PerformanceChart({ nickname }: PerformanceChartProps) {
  const t = useTranslations("overview");
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

  const points = useMemo<Point[]>(() => {
    const chronological = [...history].reverse();
    return chronological.map((m, index) => ({
      index,
      kd: m.deaths > 0 ? Math.round((m.kills / m.deaths) * 100) / 100 : m.kills,
      kills: m.kills,
      won: m.won,
    }));
  }, [history]);

  const summary = useMemo(() => {
    if (points.length === 0) return null;
    const wins = points.filter((p) => p.won).length;
    const totalKills = points.reduce((acc, p) => acc + p.kills, 0);
    const avgKd =
      Math.round((points.reduce((acc, p) => acc + p.kd, 0) / points.length) * 100) / 100;
    return {
      avgKd,
      winRate: Math.round((wins / points.length) * 100),
      totalKills,
      count: points.length,
    };
  }, [points]);

  const maxKd = useMemo(() => Math.max(1, ...points.map((p) => p.kd)), [points]);
  const { line, area } = useMemo(() => buildPath(points, maxKd), [points, maxKd]);

  if (loading) {
    return (
      <div className="rounded-card glass-strong p-6">
        <div className="h-[180px] animate-pulse rounded-lg bg-black/20" />
      </div>
    );
  }

  if (!summary || points.length < 2) {
    return (
      <div className="rounded-card glass-strong p-6">
        <div className="flex items-center gap-2 text-muted">
          <Activity className="h-5 w-5" />
          <p className="text-sm">{t("chartEmpty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card glass-strong p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <p className="font-display text-base font-bold text-foreground">{t("chartTitle")}</p>
            <p className="text-xs text-muted">{t("chartDesc", { count: summary.count })}</p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">{t("chartKd")}</p>
            <p className="font-display text-lg font-bold text-foreground">
              {summary.avgKd.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">{t("chartWinRate")}</p>
            <p className="font-display text-lg font-bold text-foreground">{summary.winRate}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">{t("chartKills")}</p>
            <p className="font-display text-lg font-bold text-foreground">{summary.totalKills}</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-44 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("chartTitle")}
        >
          <defs>
            <linearGradient id="perfArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={area}
            fill="url(#perfArea)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          {points.map((p, i) => {
            const n = points.length;
            const usableW = WIDTH - PAD_X * 2;
            const usableH = HEIGHT - PAD_Y * 2;
            const x = PAD_X + (n > 1 ? (i * usableW) / (n - 1) : usableW / 2);
            const y = PAD_Y + usableH - (maxKd > 0 ? (p.kd / maxKd) * usableH : 0);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={2.5}
                className={cn(p.won ? "fill-emerald-400" : "fill-rose-400")}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
