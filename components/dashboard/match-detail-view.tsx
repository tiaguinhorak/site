"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Download,
  Flame,
  Crosshair,
  Trophy,
  Skull,
  Bomb,
  Zap,
  Target,
  Award,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { MapThumbnail } from "@/components/ui/map-thumbnail";
import type {
  MatchDetail,
  MatchDetailDeath,
  MatchDetailPlayer,
} from "@/lib/ranked/match-detail";
import { formatMapLabel } from "@/lib/servers/maps";
import { resolveMapId } from "@/lib/servers/map-images";
import { cn } from "@/lib/utils";

type MatchDetailViewProps = {
  match: MatchDetail;
};

const HIGHLIGHT_ICON: Record<string, typeof Flame> = {
  ACE: Flame,
  CLUTCH: Trophy,
  MULTI_KILL: Crosshair,
  HEADSHOTS: Target,
  ENTRY: Zap,
  KNIFE: Award,
};

const HEATMAP_SIZE = 480;

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function Scoreboard({
  players,
  team,
  label,
  t,
}: {
  players: MatchDetailPlayer[];
  team: string;
  label: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const rows = players.filter((p) => p.team === team);
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-card glass-strong">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="font-display text-sm font-bold text-foreground">{label}</p>
      </div>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted">
            <th className="px-4 py-2 text-left">{t("colPlayer")}</th>
            <th className="px-2 py-2 text-center">K</th>
            <th className="px-2 py-2 text-center">D</th>
            <th className="px-2 py-2 text-center">A</th>
            <th className="px-2 py-2 text-center">{t("colKd")}</th>
            <th className="px-2 py-2 text-center">{t("colHs")}</th>
            <th className="px-2 py-2 text-center">{t("colAdr")}</th>
            <th className="px-2 py-2 text-center">{t("colClutch")}</th>
            <th className="px-2 py-2 text-center">{t("colEntry")}</th>
            <th className="px-2 py-2 text-center">{t("colMvp")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.steamId} className="border-t border-white/5">
              <td className="px-4 py-2 text-left font-medium text-foreground">{p.nickname}</td>
              <td className="px-2 py-2 text-center text-foreground">{p.kills}</td>
              <td className="px-2 py-2 text-center text-muted">{p.deaths}</td>
              <td className="px-2 py-2 text-center text-muted">{p.assists}</td>
              <td className="px-2 py-2 text-center text-foreground">{p.kd.toFixed(2)}</td>
              <td className="px-2 py-2 text-center text-muted">{p.hsPct}%</td>
              <td className="px-2 py-2 text-center text-muted">{p.adr}</td>
              <td className="px-2 py-2 text-center text-muted">{p.clutchesWon}</td>
              <td className="px-2 py-2 text-center text-muted">{p.entryKills}</td>
              <td className="px-2 py-2 text-center text-primary">{p.mvp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heatmap({
  deaths,
  t,
}: {
  deaths: MatchDetailDeath[];
  t: ReturnType<typeof useTranslations>;
}) {
  const rounds = useMemo(() => {
    const set = new Set<number>();
    for (const d of deaths) set.add(d.roundNumber);
    return Array.from(set).sort((a, b) => a - b);
  }, [deaths]);

  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const bounds = useMemo(() => {
    if (deaths.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const d of deaths) {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y);
    }
    if (minX === maxX) maxX = minX + 1;
    if (minY === maxY) maxY = minY + 1;
    return { minX, maxX, minY, maxY };
  }, [deaths]);

  const visible = useMemo(
    () =>
      selectedRound == null
        ? deaths
        : deaths.filter((d) => d.roundNumber === selectedRound),
    [deaths, selectedRound],
  );

  if (deaths.length === 0 || !bounds) {
    return (
      <div className="rounded-card glass-strong p-6">
        <div className="flex items-center gap-2 text-muted">
          <Skull className="h-5 w-5" />
          <p className="text-sm">{t("heatmapEmpty")}</p>
        </div>
      </div>
    );
  }

  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;

  return (
    <div className="rounded-card glass-strong p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <div>
            <p className="font-display text-base font-bold text-foreground">{t("heatmapTitle")}</p>
            <p className="text-xs text-muted">{t("heatmapDesc")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedRound(null)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              selectedRound == null
                ? "bg-primary text-black"
                : "glass text-muted hover:text-foreground",
            )}
          >
            {t("heatmapAllRounds")}
          </button>
          {rounds.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRound(r)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                selectedRound === r
                  ? "bg-primary text-black"
                  : "glass text-muted hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        <svg
          viewBox={`0 0 ${HEATMAP_SIZE} ${HEATMAP_SIZE}`}
          className="aspect-square w-full max-w-[480px] rounded-lg bg-black/30"
          role="img"
          aria-label={t("heatmapTitle")}
        >
          <rect
            x={0}
            y={0}
            width={HEATMAP_SIZE}
            height={HEATMAP_SIZE}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
          {visible.map((d, i) => {
            const nx = ((d.x - bounds.minX) / spanX) * (HEATMAP_SIZE - 24) + 12;
            const ny =
              HEATMAP_SIZE - (((d.y - bounds.minY) / spanY) * (HEATMAP_SIZE - 24) + 12);
            const color = d.victimTeam === "A" ? "#38bdf8" : "#fb7185";
            return (
              <motion.circle
                key={i}
                cx={nx}
                cy={ny}
                r={d.headshot ? 6 : 5}
                fill={color}
                fillOpacity={0.5}
                stroke={color}
                strokeOpacity={0.8}
                strokeWidth={d.headshot ? 1.5 : 0.75}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.01, 0.5) }}
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> {t("teamA")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> {t("teamB")}
        </span>
        <span className="flex items-center gap-1.5">
          <Target className="h-3 w-3" /> {t("heatmapHeadshot")}
        </span>
      </div>
    </div>
  );
}

function RoundTimeline({
  rounds,
  t,
}: {
  rounds: MatchDetail["rounds"];
  t: ReturnType<typeof useTranslations>;
}) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-card glass-strong p-6">
        <div className="flex items-center gap-2 text-muted">
          <Bomb className="h-5 w-5" />
          <p className="text-sm">{t("timelineEmpty")}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-card glass-strong p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Bomb className="h-5 w-5 text-primary" />
        <p className="font-display text-base font-bold text-foreground">{t("timelineTitle")}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {rounds.map((r) => {
          const color =
            r.winnerTeam === "A"
              ? "bg-sky-500/80"
              : r.winnerTeam === "B"
                ? "bg-rose-500/80"
                : "bg-white/20";
          return (
            <div
              key={r.roundNumber}
              title={`#${r.roundNumber}${r.reason ? ` — ${r.reason}` : ""}`}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-bold text-black",
                color,
              )}
            >
              {r.bombPlanted ? <Bomb className="h-3.5 w-3.5" /> : r.roundNumber}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MatchDetailView({ match }: MatchDetailViewProps) {
  const t = useTranslations("matchDetail");

  const teamAWon = match.winnerTeam === "A";
  const teamBWon = match.winnerTeam === "B";
  const mapId = resolveMapId(match.map ?? "");
  const mapLabel = match.map ? formatMapLabel(mapId || match.map) : "—";

  return (
    <div className="space-y-6">
      <div className="rounded-card glass-strong p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {mapId ? (
              <MapThumbnail mapId={mapId} label={mapLabel} size={72} rounded="xl" />
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">{mapLabel}</p>
              <div className="mt-1 flex items-center gap-3 font-display text-3xl font-bold">
                <span className={cn(teamAWon ? "text-sky-400" : "text-foreground")}>
                  {match.scoreTeamA ?? 0}
                </span>
                <span className="text-muted">:</span>
                <span className={cn(teamBWon ? "text-rose-400" : "text-foreground")}>
                  {match.scoreTeamB ?? 0}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {match.finishedAt
                  ? new Date(match.finishedAt).toLocaleString()
                  : t("notFinished")}{" "}
                · {formatDuration(match.durationSec)}
              </p>
            </div>
          </div>
          {match.demoUrl ? (
            <a
              href={match.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              {t("downloadDemo")}
            </a>
          ) : null}
        </div>
      </div>

      {match.highlights.length > 0 ? (
        <div className="rounded-card glass-strong p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <p className="font-display text-base font-bold text-foreground">
              {t("highlightsTitle")}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {match.highlights.map((h) => {
              const Icon = HIGHLIGHT_ICON[h.type] ?? Flame;
              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-md glass px-3 py-2"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {t(`highlightType.${h.type}` as never)} · {h.nickname}
                    </p>
                    {h.detail ? <p className="text-[10px] text-muted">{h.detail}</p> : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        <Scoreboard players={match.players} team="A" label={t("teamA")} t={t} />
        <Scoreboard players={match.players} team="B" label={t("teamB")} t={t} />
      </div>

      <RoundTimeline rounds={match.rounds} t={t} />

      <Heatmap deaths={match.deaths} t={t} />
    </div>
  );
}
