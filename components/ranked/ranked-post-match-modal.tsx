"use client";

import { Loader2, RefreshCw, Shuffle, LogOut, Swords, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MapChip } from "@/components/ui/map-chip";
import type { RankedMatchSessionView } from "@/lib/ranked/party-shared";
import { formatLiveScore } from "@/lib/ranked/match-flow";
import { ModalPortal } from "@/components/ui/modal-portal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  session: RankedMatchSessionView;
  loading: string | null;
  onRematch: () => void;
  onSwapRematch: () => void;
  onLeaveRoom: () => void;
  onClose: () => void;
};

export function RankedPostMatchModal({
  open,
  session,
  loading,
  onRematch,
  onSwapRematch,
  onLeaveRoom,
  onClose,
}: Props) {
  const t = useTranslations("ranked.postMatchModal");
  if (!open) return null;

  const hasScore =
    session.scoreTeamA != null && session.scoreTeamB != null;
  const youWon =
    Boolean(session.yourTeam) &&
    Boolean(session.winnerTeam) &&
    session.winnerTeam === session.yourTeam;
  const youLost =
    Boolean(session.yourTeam) &&
    Boolean(session.winnerTeam) &&
    session.winnerTeam !== session.yourTeam;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[125] flex items-center justify-center p-4">
        <button
          type="button"
          className="scrim-dim absolute inset-0 cursor-default"
          aria-label={t("close")}
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl glass-modal shadow-2xl">
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-1",
              youWon
                ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                : youLost
                  ? "bg-gradient-to-r from-rose-400 to-orange-400"
                  : "bg-gradient-to-r from-primary to-violet-500",
            )}
            aria-hidden
          />

          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {t("eyebrow")}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">{t("title")}</h2>
                {(youWon || youLost) && (
                  <p
                    className={cn(
                      "mt-2 flex items-center gap-1.5 text-sm font-semibold",
                      youWon ? "text-emerald-300" : "text-rose-300",
                    )}
                  >
                    {youWon && <Trophy className="h-4 w-4" />}
                    {youWon ? t("youWon") : t("youLost")}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted">{t("description")}</p>
              </div>
              <Swords className="h-6 w-6 shrink-0 text-primary" />
            </div>

            {hasScore && (
              <div className="mt-5 rounded-xl border border-border/60 bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-4 py-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("finalScore")}
                </p>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <div>
                    <p className="text-xs text-muted">{t("teamA")}</p>
                    <p className="font-display text-3xl font-bold">{session.scoreTeamA}</p>
                  </div>
                  <p className="font-display text-xl font-bold text-muted">
                    {formatLiveScore(session)}
                  </p>
                  <div>
                    <p className="text-xs text-muted">{t("teamB")}</p>
                    <p className="font-display text-3xl font-bold">{session.scoreTeamB}</p>
                  </div>
                </div>
              </div>
            )}

            {session.selectedMap && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <MapChip mapId={session.selectedMap} size={28} />
              </div>
            )}

            {!hasScore && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted">{t("teamA")}</p>
                  <p className="font-semibold">
                    {t("players", { count: session.partyA.memberCount })}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted">{t("teamB")}</p>
                  <p className="font-semibold">
                    {t("players", { count: session.partyB.memberCount })}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <Button
                variant="primary"
                disabled={loading != null}
                onClick={onRematch}
                className="w-full justify-center"
              >
                {loading === "rematch" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t("rematchSame")}
              </Button>
              <Button
                variant="outline"
                disabled={loading != null}
                onClick={onSwapRematch}
                className="w-full justify-center"
              >
                {loading === "swap" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}
                {t("rematchSwap")}
              </Button>
              <Button
                variant="ghost"
                disabled={loading != null}
                onClick={onLeaveRoom}
                className="w-full justify-center text-muted"
              >
                {loading === "leave" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {t("leaveRoom")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
