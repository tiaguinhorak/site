"use client";

import { Loader2, Search, ShieldAlert, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  useRankedParty,
  RANKED_TEAM_SIZE,
  formatRestrictionDuration,
} from "@/components/providers/ranked-party-provider";
import { useUser } from "@/lib/hooks/use-user";
import { RANKED_MAP_POOL } from "@/lib/ranked/constants";

export function RankedSoloPanel() {
  const { party, queue, restriction, createTeam, joinQueue, leaveQueue } = useRankedParty();
  const { user } = useUser();
  const t = useTranslations("ranked.solo");

  const isSoloParty = party != null && party.memberCount === 1;
  const canQueue =
    party?.isLeader && party.memberCount >= 1 && party.memberCount < RANKED_TEAM_SIZE;
  const inQueue = Boolean(queue?.searching);
  const blocked = Boolean(restriction?.restricted);

  async function ensureSoloParty() {
    if (party) return true;
    return createTeam({
      name: t("defaultPartyName", {
        nickname: user?.displayName ?? user?.nickname ?? t("defaultPlayer"),
      }),
      region: "BR",
      visibility: "public",
      minLevel: 1,
      maxLevel: 20,
      mapPool: [...RANKED_MAP_POOL],
    });
  }

  async function handlePlaySolo() {
    if (blocked) return;
    const ready = await ensureSoloParty();
    if (!ready) return;
    await joinQueue();
  }

  if (!user?.steamLinked) return null;
  // Already in a room/team (has teammates): use the room's challenge flow, not solo queue.
  if (party && party.memberCount > 1) return null;
  if (party?.memberCount === RANKED_TEAM_SIZE) return null;

  return (
    <section className="rounded-card glass-strong border border-violet-400/25 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <User className="h-5 w-5 text-violet-300" />
            {t("title")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">{t("description")}</p>
          {inQueue && queue && (
            <p className="mt-2 text-sm text-violet-300">
              {t("searching", {
                players: queue.playersInQueue,
                parties: queue.partiesInQueue,
              })}
            </p>
          )}
          {inQueue && queue?.estimatedWaitSec != null && (
            <p className="mt-1 text-xs text-muted">
              {t("estimatedWait", { seconds: queue.estimatedWaitSec })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {inQueue ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void leaveQueue()}>
              {t("leaveQueue")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={
                blocked || (!canQueue && !isSoloParty && party != null && !party.isLeader)
              }
              onClick={() => void handlePlaySolo()}
            >
              <Search className="h-4 w-4" />
              {t("findMatch")}
            </Button>
          )}
        </div>
      </div>

      {restriction && restriction.restricted && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{t("restrictedTitle")}</p>
            <p className="mt-1 text-amber-200/90">
              {t("restrictedWait", {
                duration: formatRestrictionDuration(restriction.remainingMs),
              })}
            </p>
          </div>
        </div>
      )}

      {restriction && !restriction.restricted && restriction.dodges > 0 && (
        <p className="mt-3 text-xs text-muted">{restriction.message}</p>
      )}

      {party && party.memberCount > 1 && party.memberCount < RANKED_TEAM_SIZE && (
        <p className="mt-3 text-xs text-muted">{t("partialTeamHint")}</p>
      )}

      {inQueue && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 motion-safe-spin" />
          {t("queueActiveHint")}
        </div>
      )}
    </section>
  );
}
