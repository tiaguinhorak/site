"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RankedRoomCard } from "@/components/dashboard/ranked-room-card";
import {
  DEFAULT_RANKED_FILTERS,
  type RankedRoomsFilterState,
  type RankedRoomStatusFilter,
} from "@/components/dashboard/ranked-rooms-filters";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import type { RankedPartyView } from "@/lib/ranked/party-shared";
import { cn } from "@/lib/utils";

const QUICK_FILTERS: { value: RankedRoomStatusFilter; labelKey: string }[] = [
  { value: "all", labelKey: "quickAll" },
  { value: "challengeable", labelKey: "quickChallengeable" },
  { value: "open", labelKey: "quickOpen" },
  { value: "full", labelKey: "quickFull" },
  { value: "in_match", labelKey: "quickInMatch" },
];

type Props = {
  onJoinPrivate?: (room: RankedPartyView) => void;
  filters?: RankedRoomsFilterState;
  onStatusFilterChange?: (status: RankedRoomStatusFilter) => void;
};

export function RankedRoomsBrowser({
  onJoinPrivate,
  filters = DEFAULT_RANKED_FILTERS,
  onStatusFilterChange,
}: Props) {
  const {
    rooms,
    eligibility,
    party,
    joinRoom,
    sendChallenge,
    refresh,
    error,
  } = useRankedParty();
  const t = useTranslations("ranked.browser");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const canPlay = eligibility?.canPlay ?? false;
  const hasParty = Boolean(party);
  const isLeaderFullParty = Boolean(party?.isLeader && party.memberCount >= party.slots);

  const filteredRooms = useMemo(() => {
    let base = [...rooms];

    if (filters.onlyWithSlots) {
      base = base.filter((room) => room.status === "open");
    }

    if (filters.statusFilter === "challengeable") {
      base = base.filter((room) => room.status === "full" && !room.isMember);
    } else if (filters.statusFilter !== "all") {
      base = base.filter((room) => room.status === filters.statusFilter);
    }

    base = base.filter(
      (room) =>
        room.avgLevel >= filters.levelMin &&
        room.avgLevel <= filters.levelMax &&
        room.maxLevel >= filters.levelMin &&
        room.minLevel <= filters.levelMax,
    );

    const q = filters.search.trim().toLowerCase();
    if (q) {
      base = base.filter(
        (room) =>
          room.name.toLowerCase().includes(q) ||
          room.leaderNickname.toLowerCase().includes(q) ||
          room.leaderDisplayName.toLowerCase().includes(q) ||
          room.members.some(
            (m) =>
              m.nickname.toLowerCase().includes(q) ||
              m.displayName.toLowerCase().includes(q),
          ),
      );
    }

    return base;
  }, [rooms, filters]);

  const challengeableCount = useMemo(
    () => rooms.filter((r) => r.status === "full" && !r.isMember).length,
    [rooms],
  );

  function resolveAction(room: RankedPartyView) {
    if (room.isMember) return { kind: "open" as const };
    if (!canPlay) return { kind: "locked" as const };
    if (room.status === "in_match") return { kind: "in_match" as const };
    if (isLeaderFullParty && room.status === "full") return { kind: "challenge" as const };
    if (hasParty && room.status === "open") return { kind: "in_team" as const };
    if (room.status === "full") return { kind: "full" as const };
    if (room.status === "open" && !hasParty) return { kind: "join" as const };
    return { kind: "open" as const };
  }

  async function handleJoin(partyId: string) {
    const room = rooms.find((r) => r.id === partyId);
    if (room?.visibility === "private" && room.hasPassword && onJoinPrivate) {
      onJoinPrivate(room);
      return;
    }
    setBusyId(partyId);
    await joinRoom(partyId);
    setBusyId(null);
  }

  async function handleChallenge(partyId: string) {
    setBusyId(partyId);
    await sendChallenge(partyId);
    setBusyId(null);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted">
            {t("results", { count: filteredRooms.length })}
            {challengeableCount > 0 && (
              <span className="text-violet-300">
                {" · "}
                {t("readyToChallenge", { count: challengeableCount })}
              </span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "motion-safe-spin")} />
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onStatusFilterChange?.(f.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              filters.statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "glass text-muted hover:text-foreground",
            )}
          >
            {t(f.labelKey)}
            {f.value === "challengeable" && challengeableCount > 0 && (
              <span className="ml-1 text-[10px]">({challengeableCount})</span>
            )}
          </button>
        ))}
      </div>

      {filteredRooms.length === 0 ? (
        <div className="rounded-card glass p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredRooms.map((room) => (
            <RankedRoomCard
              key={room.id}
              room={room}
              action={resolveAction(room)}
              busy={busyId === room.id}
              onJoin={(id) => void handleJoin(id)}
              onChallenge={(id) => void handleChallenge(id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
