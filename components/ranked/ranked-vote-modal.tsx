"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2, MapPin, Timer, Vote, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MapThumbnail } from "@/components/ui/map-thumbnail";
import type {
  RankedMapVoteStateView,
  RankedMatchSessionView,
} from "@/lib/ranked/party-shared";
import { formatMapLabel } from "@/lib/servers/maps";
import { cn } from "@/lib/utils";
import { ModalPortal } from "@/components/ui/modal-portal";

function mapLabel(map: string | null | undefined): string {
  if (!map) return "—";
  return formatMapLabel(map);
}

type Props = {
  open: boolean;
  session: RankedMatchSessionView;
  vote: RankedMapVoteStateView;
  launchMessage: string | null;
  actionLoading: string | null;
  onPickMap: (mapId: string) => void;
  onClose: () => void;
};

export function RankedVoteModal({
  open,
  session,
  vote,
  launchMessage,
  actionLoading,
  onPickMap,
  onClose,
}: Props) {
  const t = useTranslations("ranked.voteModal");
  const [secondsLeft, setSecondsLeft] = useState(vote.secondsLeft);

  useEffect(() => {
    setSecondsLeft(vote.secondsLeft);
  }, [vote.secondsLeft, vote.endsAt]);

  useEffect(() => {
    if (!open || vote.isComplete) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, vote.isComplete]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const waitingServer = vote.isComplete && !session.serverHost;
  const maxVotes = Math.max(1, ...vote.options.map((o) => o.votes));

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="scrim-dim absolute inset-0 cursor-default"
        aria-label={t("closeModal")}
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal
        aria-labelledby="ranked-vote-title"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-[121] w-full max-w-2xl overflow-hidden rounded-2xl glass-modal shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
          aria-label={t("close")}
        >
          <X className="h-5 w-5" />
        </button>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-primary to-violet-500"
          aria-hidden
        />

        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              {vote.isComplete ? <MapPin className="h-6 w-6" /> : <Vote className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p
                id="ranked-vote-title"
                className="font-display text-xl font-bold text-foreground sm:text-2xl"
              >
                {vote.isComplete ? t("mapChosen") : t("title")}
              </p>
              <p className="mt-1 text-sm text-muted">
                {waitingServer
                  ? t("preparing", { map: mapLabel(session.selectedMap ?? vote.selectedMap) })
                  : vote.isComplete
                    ? t("winner", { map: mapLabel(session.selectedMap ?? vote.selectedMap) })
                    : t("subtitle")}
              </p>
            </div>

            {!vote.isComplete && (
              <div
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-lg font-bold",
                  secondsLeft <= 5
                    ? "bg-rose-500/15 text-rose-300"
                    : "bg-primary/10 text-foreground",
                )}
              >
                <Timer className="h-4 w-4" />
                {secondsLeft}s
              </div>
            )}
          </div>

          {!vote.isComplete && (
            <>
              <div className="mt-5 flex items-center justify-between text-xs text-muted">
                <span>
                  {t("voted", { voted: vote.votedCount, required: vote.requiredCount })}
                </span>
                {vote.yourVote && (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <Check className="h-3.5 w-3.5" /> {t("yourVote", { map: mapLabel(vote.yourVote) })}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {vote.options.map((option) => {
                  const selected = option.isYourVote;
                  const loading = actionLoading === option.map;
                  return (
                    <button
                      key={option.map}
                      type="button"
                      disabled={actionLoading != null}
                      onClick={() => onPickMap(option.map)}
                      className={cn(
                        "group relative flex h-auto min-h-[5rem] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-2 py-3 text-center transition-colors",
                        selected
                          ? "border-primary bg-primary/15"
                          : "border-border glass hover:border-primary/60",
                        actionLoading != null && !loading && "opacity-60",
                      )}
                    >
                      <span
                        className="pointer-events-none absolute inset-x-0 bottom-0 bg-primary/15 transition-all"
                        style={{ height: `${(option.votes / maxVotes) * 100}%` }}
                        aria-hidden
                      />
                      <MapThumbnail
                        mapId={option.map}
                        label={mapLabel(option.map)}
                        size={44}
                        rounded="lg"
                        className="relative z-[1]"
                      />
                      <span className="relative z-[1] font-display text-sm font-bold text-foreground">
                        {loading ? (
                          <Loader2 className="h-5 w-5 motion-safe-spin" />
                        ) : (
                          mapLabel(option.map)
                        )}
                      </span>
                      <span className="relative flex items-center gap-1 text-[11px] font-semibold text-muted">
                        {option.votes} {option.votes === 1 ? t("voteOne") : t("voteOther")}
                        {selected && <Check className="h-3 w-3 text-emerald-300" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-center text-xs text-muted">
                {t("changeHint")}
              </p>
            </>
          )}

          {waitingServer && (
            <div className="mt-8 flex flex-col items-center gap-3 py-4 text-center">
              <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
              {(session.selectedMap ?? vote.selectedMap) && (
                <MapThumbnail
                  mapId={session.selectedMap ?? vote.selectedMap ?? ""}
                  label={mapLabel(session.selectedMap ?? vote.selectedMap)}
                  size={56}
                  rounded="xl"
                />
              )}
              <p className="text-sm text-emerald-300">
                {mapLabel(session.selectedMap ?? vote.selectedMap)}
              </p>
              {launchMessage && (
                <p className="max-w-md text-sm text-amber-300">{launchMessage}</p>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t("close")}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
    </ModalPortal>
  );
}
