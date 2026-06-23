"use client";

import { useMemo, useState } from "react";
import { Crown, Loader2, Mail, Send, Swords, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import type { RankedPartyView } from "@/lib/ranked/party-shared";
import { cn } from "@/lib/utils";
import { textWarningClass, textWarningPanelClass, textWarningSoftClass } from "@/lib/ui/theme-surfaces";

function OpponentRow({
  room,
  busy,
  onChallenge,
}: {
  room: RankedPartyView;
  busy: boolean;
  onChallenge: (partyId: string) => void;
}) {
  const t = useTranslations("ranked.challenges");

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 font-display text-sm font-bold text-violet-300">
        {room.avgLevel}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{room.name}</p>
        <p className="text-[11px] text-muted">
          {room.leaderNickname}
          <span className="mx-1">·</span>
          {room.region}
          <span className="mx-1">·</span>
          {t("opponentPlayers", { count: room.memberCount })}
        </p>
      </div>
      <Button
        variant="primary"
        size="sm"
        className="h-8 shrink-0 text-xs"
        disabled={busy}
        onClick={() => onChallenge(room.id)}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
        {t("challengeBtn")}
      </Button>
    </li>
  );
}

export function RankedChallengesPanel({ className }: { className?: string }) {
  const {
    party,
    session,
    challengeableParties,
    incomingChallenges,
    outgoingChallenges,
    sendChallenge,
    respondChallenge,
  } = useRankedParty();
  const t = useTranslations("ranked.challenges");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const inMatchFlow = Boolean(
    session && session.status !== "finished" && session.status !== "cancelled",
  );

  const isLeader = party?.isLeader ?? false;
  const partyFull = Boolean(party && party.memberCount >= party.slots);
  const canChallenge = isLeader && partyFull && !inMatchFlow;

  const outgoingIds = useMemo(
    () => new Set(outgoingChallenges.map((c) => c.toPartyId)),
    [outgoingChallenges],
  );

  const opponents = useMemo(
    () => challengeableParties.filter((p) => !outgoingIds.has(p.id)),
    [challengeableParties, outgoingIds],
  );

  const hasIncoming = incomingChallenges.length > 0;
  const hasOutgoing = outgoingChallenges.length > 0;

  if (!party) return null;

  async function handleChallenge(partyId: string) {
    setActionLoading(partyId);
    await sendChallenge(partyId);
    setActionLoading(null);
  }

  return (
    <section
      className={cn(
        "rounded-card glass-strong border border-violet-400/20 p-4 shadow-[0_0_32px_-12px_var(--primary)]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <Swords className="h-4 w-4 text-violet-300" />
          {t("title")}
        </h3>
        {canChallenge && opponents.length > 0 && (
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300">
            {t("opponentsCount", { count: opponents.length })}
          </span>
        )}
      </header>

      {!partyFull && (
        <p className={cn("mt-3 rounded-xl border px-3 py-2.5 text-xs", textWarningPanelClass)}>
          <Users className="mb-1 inline h-3.5 w-3.5 mr-1" />
          {t("waitingFull", { count: party.slots - party.memberCount })}
        </p>
      )}

      {partyFull && !isLeader && (
        <p className="mt-3 text-xs text-muted">{t("leaderSendsChallenges")}</p>
      )}

      {hasIncoming && (
        <div className="mt-4">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Mail className="h-3.5 w-3.5" />
            {t("incoming", { count: incomingChallenges.length })}
          </h4>
          <ul className="mt-2 space-y-2">
            {incomingChallenges.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-primary/30 bg-primary/5 p-3"
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Crown className={cn("h-3.5 w-3.5", textWarningSoftClass)} />
                  {c.fromLeaderNickname}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">{t("wantPlay")}</p>
                {isLeader ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={actionLoading === c.id}
                      onClick={async () => {
                        setActionLoading(c.id);
                        await respondChallenge(c.id, false);
                        setActionLoading(null);
                      }}
                    >
                      {t("decline")}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={actionLoading === c.id}
                      onClick={async () => {
                        setActionLoading(c.id);
                        await respondChallenge(c.id, true);
                        setActionLoading(null);
                      }}
                    >
                      {t("accept")}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted">{t("nonLeaderNote")}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLeader && hasOutgoing && (
        <div className="mt-4">
          <h4 className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-wider", textWarningSoftClass)}>
            <Send className="h-3.5 w-3.5" />
            {t("outgoing", { count: outgoingChallenges.length })}
          </h4>
          <ul className="mt-2 space-y-2">
            {outgoingChallenges.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-sm"
              >
                <span className="truncate font-medium">{c.toLeaderNickname}</span>
                <span className={cn("inline-flex shrink-0 items-center gap-1 text-[10px]", textWarningSoftClass)}>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("pending")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canChallenge && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            {t("opponents")}
          </h4>
          {opponents.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
              {t("opponentsEmpty")}
            </p>
          ) : (
            <ul className="mt-2 space-y-2 max-h-[min(280px,40vh)] overflow-y-auto pr-0.5">
              {opponents.map((room) => (
                <OpponentRow
                  key={room.id}
                  room={room}
                  busy={actionLoading === room.id}
                  onChallenge={(id) => void handleChallenge(id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {inMatchFlow && (
        <p className="mt-3 text-xs text-muted">{t("matchBlocksChallenges")}</p>
      )}
    </section>
  );
}
