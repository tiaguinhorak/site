"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { RankedMatchFlow } from "@/components/dashboard/ranked-match-flow";
import { RankedSoloPanel } from "@/components/dashboard/ranked-solo-panel";
import { RankedRoomsBrowser } from "@/components/dashboard/ranked-rooms-browser";
import { RankedTeamCompact } from "@/components/dashboard/ranked-team-compact";
import { RankedChallengesPanel } from "@/components/dashboard/ranked-challenges-panel";
import { RankedRoomChat } from "@/components/dashboard/ranked-room-chat";
import {
  RankedRoomsFilters,
  DEFAULT_RANKED_FILTERS,
  type RankedRoomsFilterState,
} from "@/components/dashboard/ranked-rooms-filters";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import type { RankedPartyView } from "@/lib/ranked/party-shared";
import { cn } from "@/lib/utils";

type Props = {
  party: RankedPartyView | null;
  onEditTeam: () => void;
  onCreateTeam?: () => void;
  onJoinPrivate: (room: RankedPartyView) => void;
  onJoinByCode?: () => void;
};

function countActiveFilters(f: RankedRoomsFilterState): number {
  let n = 0;
  if (f.search.trim()) n += 1;
  if (f.levelMin !== 1 || f.levelMax !== 20) n += 1;
  if (f.onlyWithSlots) n += 1;
  if (f.statusFilter !== "all") n += 1;
  if (f.playWith !== "all") n += 1;
  return n;
}

export function RankedHubLayout({
  party,
  onEditTeam,
  onCreateTeam,
  onJoinPrivate,
  onJoinByCode,
}: Props) {
  const { rooms, roomStats, error } = useRankedParty();
  const t = useTranslations("ranked");
  const [filters, setFilters] = useState<RankedRoomsFilterState>(DEFAULT_RANKED_FILTERS);

  const activeFilterCount = countActiveFilters(filters);

  const displayRoomCount = useMemo(() => {
    let base = rooms;
    if (filters.onlyWithSlots) base = base.filter((r) => r.status === "open");
    return base.length;
  }, [rooms, filters.onlyWithSlots]);

  return (
    <div className="space-y-5">
      {error && (
        <p
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <RankedMatchFlow />

      <RankedSoloPanel />

      <div
        className={cn(
          party
            ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:items-start xl:gap-8"
            : "space-y-5",
        )}
      >
        {/* Coluna principal: lista de salas */}
        <div className="min-w-0 space-y-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">
              {t("tabs.rooms")}
            </h2>
          </div>

          {!party && (onCreateTeam || onJoinByCode) && (
            <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-primary/30 glass p-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <p className="text-sm text-muted">{t("hub.createPrompt")}</p>
              <div className="flex shrink-0 flex-wrap justify-center gap-2">
                {onJoinByCode && (
                  <button
                    type="button"
                    onClick={onJoinByCode}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
                  >
                    {t("hub.joinByCode")}
                  </button>
                )}
                {onCreateTeam && (
                  <button
                    type="button"
                    onClick={onCreateTeam}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    {t("hub.createCta")}
                  </button>
                )}
              </div>
            </div>
          )}

          <RankedRoomsFilters
            filters={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onClear={() => setFilters(DEFAULT_RANKED_FILTERS)}
            roomCount={displayRoomCount}
            playerCount={roomStats.players}
            activeFilterCount={activeFilterCount}
          />

          <RankedRoomsBrowser
            filters={filters}
            onStatusFilterChange={(status) =>
              setFilters((prev) => ({ ...prev, statusFilter: status }))
            }
            onJoinPrivate={onJoinPrivate}
          />
        </div>

        {/* Sidebar: minha sala + desafios + chat */}
        {party && (
          <aside
            className={cn(
              "flex min-w-0 flex-col gap-5",
              "lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:self-start",
              "lg:border-l lg:border-border/60 lg:pl-6",
            )}
          >
            <div className="rounded-card glass-strong border border-primary/25 p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="font-display text-sm font-bold uppercase tracking-wider text-primary">
                  {t("hub.yourRoom")}
                </p>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                  {t("hub.live")}
                </span>
              </div>
              <RankedTeamCompact
                variant="sidebar"
                team={party}
                onEditTeam={onEditTeam}
              />
            </div>

            <RankedChallengesPanel />

            <RankedRoomChat className="min-h-[300px] lg:min-h-[280px] lg:max-h-[min(420px,calc(100dvh-28rem))]" />
          </aside>
        )}
      </div>
    </div>
  );
}
