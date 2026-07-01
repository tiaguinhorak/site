"use client";

import { Loader2, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRankedParty, RANKED_TEAM_SIZE } from "@/components/providers/ranked-party-provider";
import { useUser } from "@/lib/hooks/use-user";
import { RANKED_MAP_POOL } from "@/lib/ranked/constants";

export function RankedSoloPanel() {
  const { party, queue, createTeam, joinQueue, leaveQueue } = useRankedParty();
  const { user } = useUser();
  const t = useTranslations("ranked.solo");

  const isSoloParty = party != null && party.memberCount === 1;
  const canQueue = party?.isLeader && party.memberCount >= 1 && party.memberCount < RANKED_TEAM_SIZE;
  const inQueue = Boolean(queue?.searching);

  async function ensureSoloParty() {
    if (party) return true;
    return createTeam({
      name: `${user?.nickname ?? "Jogador"} Solo`,
      region: "BR",
      visibility: "public",
      minLevel: 1,
      maxLevel: 20,
      mapPool: [...RANKED_MAP_POOL],
    });
  }

  async function handlePlaySolo() {
    const ready = await ensureSoloParty();
    if (!ready) return;
    await joinQueue();
  }

  if (!user?.steamLinked) return null;
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
              disabled={!canQueue && !isSoloParty && party != null && !party.isLeader}
              onClick={() => void handlePlaySolo()}
            >
              <Search className="h-4 w-4" />
              {t("findMatch")}
            </Button>
          )}
        </div>
      </div>
      {party && party.memberCount > 1 && party.memberCount < RANKED_TEAM_SIZE && (
        <p className="mt-3 text-xs text-muted">{t("partialTeamHint")}</p>
      )}
    </section>
  );
}
