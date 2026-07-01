"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Loader2,
  MapPin,
  Radio,
  Server,
  Swords,
  Vote,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ServerConnectActions } from "@/components/ui/server-connect-actions";
import { MapChip } from "@/components/ui/map-chip";
import { RankedFlowStepper } from "@/components/ranked/ranked-flow-stepper";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { useUser } from "@/lib/hooks/use-user";
import {
  deriveRankedFlowStep,
  formatLiveScore,
  sessionHasLiveScore,
} from "@/lib/ranked/match-flow";
import { cn } from "@/lib/utils";

export function RankedMatchFlow() {
  const {
    session,
    queue,
    launchMessage,
    cancelMatch,
    voteModalVisible,
    connectModalVisible,
    acceptModalVisible,
    reopenVoteModal,
    reopenConnectModal,
    reopenAcceptModal,
  } = useRankedParty();
  const { user } = useUser();
  const t = useTranslations("ranked.flow");
  const tMatch = useTranslations("ranked.match");
  const confirmPresets = useConfirmPresets();

  const step = deriveRankedFlowStep({
    session,
    queueSearching: Boolean(queue?.searching),
  });

  const inMatchFlow = Boolean(
    session && session.status !== "finished" && session.status !== "cancelled",
  );

  if (step === "idle" && !inMatchFlow) return null;

  const showLiveScore = sessionHasLiveScore(session);
  const serverMissing =
    session?.status === "starting" &&
    !session.serverHost &&
    Boolean(launchMessage?.toLowerCase().includes("servidor") ||
      launchMessage?.toLowerCase().includes("server"));

  return (
    <section className="overflow-hidden rounded-card border border-violet-400/30 glass-strong">
      <div className="border-b border-border/60 bg-gradient-to-r from-violet-500/10 via-primary/5 to-cyan-500/10 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              {step === "live" ? (
                <Radio className="h-5 w-5 motion-safe-pulse" />
              ) : (
                <Swords className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-display text-base font-bold text-foreground sm:text-lg">
                {step === "queue" ? t("queueTitle") : t("matchTitle")}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {step === "queue"
                  ? t("queueHint", {
                      players: queue?.playersInQueue ?? 0,
                      parties: queue?.partiesInQueue ?? 0,
                    })
                  : t(`status.${session?.status ?? "accepting"}`)}
              </p>
            </div>
          </div>
          {step !== "queue" && session && (
            <RankedFlowStepper current={step === "idle" ? "accepting" : step} />
          )}
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {step === "queue" && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-400/25 bg-violet-500/8 px-4 py-3">
            <Loader2 className="h-5 w-5 motion-safe-spin text-violet-300" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t("searching")}</p>
              {queue?.estimatedWaitSec != null && (
                <p className="text-xs text-muted">
                  {t("estimatedWait", { seconds: queue.estimatedWaitSec })}
                </p>
              )}
            </div>
          </div>
        )}

        {session && inMatchFlow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {showLiveScore && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-5 text-center">
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted">{tMatch("teamAlpha")}</p>
                    <p className="font-display text-3xl font-bold text-foreground">
                      {session.scoreTeamA}
                    </p>
                  </div>
                  <p className="font-display text-2xl font-bold text-emerald-300">
                    {formatLiveScore(session)}
                  </p>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted">{tMatch("teamBravo")}</p>
                    <p className="font-display text-3xl font-bold text-foreground">
                      {session.scoreTeamB}
                    </p>
                  </div>
                </div>
                {session.liveRound != null && (
                  <p className="mt-2 text-xs text-muted">
                    {t("liveRound", { round: session.liveRound })}
                  </p>
                )}
              </div>
            )}

            {session.selectedMap && (
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="h-4 w-4 text-muted" />
                <MapChip mapId={session.selectedMap} className="text-sm" size={28} />
              </div>
            )}

            {launchMessage && session.status === "starting" && (
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  serverMissing
                    ? "border border-amber-400/30 bg-amber-500/10 text-amber-200"
                    : "text-muted",
                )}
              >
                {launchMessage}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {session.status === "accepting" && !acceptModalVisible && (
                <Button variant="primary" size="sm" onClick={reopenAcceptModal}>
                  <Swords className="h-4 w-4" />
                  {t("openAccept")}
                </Button>
              )}
              {session.status === "voting" && !voteModalVisible && (
                <Button variant="primary" size="sm" onClick={reopenVoteModal}>
                  <Vote className="h-4 w-4" />
                  {tMatch("openVote")}
                </Button>
              )}
              {session.serverHost && session.serverPort && !connectModalVisible && (
                <Button variant="primary" size="sm" onClick={reopenConnectModal}>
                  <Server className="h-4 w-4" />
                  {tMatch("openConnect")}
                </Button>
              )}
              {["accepting", "voting", "starting"].includes(session.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  confirm={confirmPresets.rankedCancelMatch}
                  onClick={() => void cancelMatch()}
                >
                  <XCircle className="h-4 w-4" />
                  {tMatch("cancel")}
                </Button>
              )}
            </div>

            {session.serverHost && session.serverPort && (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/8 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("connectInline")}
                </p>
                <ServerConnectActions
                  host={session.serverHost}
                  port={session.serverPort}
                  size="md"
                />
              </div>
            )}

            {serverMissing && user?.isAdmin && (
              <p className="text-sm text-amber-300">
                {tMatch("registerServer")}{" "}
                <Link
                  href="/admin/infra-csgo"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {tMatch("adminInfra")}
                </Link>
              </p>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
