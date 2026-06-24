"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Loader2, Swords, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ServerConnectActions } from "@/components/ui/server-connect-actions";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { useUser } from "@/lib/hooks/use-user";
import { RANKED_MAP_LABELS } from "@/lib/ranked/constants";
import type { RankedPartyMemberView } from "@/lib/ranked/party-shared";

function TeamBlock({
  title,
  members,
}: {
  title: string;
  members: RankedPartyMemberView[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.id} className="text-sm">
            {m.nickname} · {m.elo} ELO
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RankedMatchFlow() {
  const {
    session,
    launchMessage,
    acceptMatch,
    cancelMatch,
    voteModalVisible,
    connectModalVisible,
    reopenVoteModal,
    reopenConnectModal,
  } = useRankedParty();
  const { user } = useUser();
  const t = useTranslations("ranked.match");
  const confirmPresets = useConfirmPresets();

  const inMatchFlow = Boolean(
    session && session.status !== "finished" && session.status !== "cancelled",
  );

  if (!session || !inMatchFlow) return null;

  return (
    <div className="rounded-card glass-strong border border-violet-400/30 p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2 text-violet-300">
        <Swords className="h-4 w-4" />
        <span className="font-display text-sm font-bold uppercase tracking-wider">
          {t("inProgress")}
        </span>
      </div>
      <AnimatePresence mode="wait">
        {session.status === "accepting" && (
          <motion.div key="accepting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-display text-lg font-bold">{t("confirmMatch")}</h3>
            <p className="mt-1 text-sm text-muted">
              {t("confirmed", {
                accepted: session.acceptedCount,
                required: session.requiredCount,
              })}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TeamBlock title={t("teamAlpha")} members={session.partyA.members} />
              <TeamBlock title={t("teamBravo")} members={session.partyB.members} />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {session.acceptances.map((a) => (
                <li key={a.userId} className="flex items-center gap-2">
                  {a.accepted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Loader2 className="h-4 w-4 motion-safe-spin text-muted" />
                  )}
                  {a.nickname}
                  {a.isYou && ` ${t("you")}`}
                </li>
              ))}
            </ul>
            {!session.youAccepted && (
              <Button variant="primary" size="lg" className="mt-4" onClick={() => void acceptMatch()}>
                {t("ready")}
              </Button>
            )}
          </motion.div>
        )}

        {session.status !== "accepting" && (
          <motion.div key="in-progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-display text-lg font-bold">
              {session.status === "live" ? t("live") : t("inProgress")}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {session.status === "voting"
                ? t("votingHint")
                : session.serverHost
                  ? t("serverReady")
                  : launchMessage ?? t("waitingServer")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {session.status === "voting" && !voteModalVisible && (
                <Button variant="outline" size="sm" onClick={reopenVoteModal}>
                  {t("openVote")}
                </Button>
              )}
              {session.serverHost && session.serverPort && !connectModalVisible && (
                <Button variant="outline" size="sm" onClick={reopenConnectModal}>
                  {t("openConnect")}
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
                  {t("cancel")}
                </Button>
              )}
            </div>
            {session.status === "starting" &&
              !session.serverHost &&
              launchMessage?.includes("Nenhum servidor") &&
              user?.isAdmin && (
                <p className="mt-3 text-sm text-amber-400">
                  {t("registerServer")}{" "}
                  <Link
                    href="/admin/infra-csgo"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {t("adminInfra")}
                  </Link>
                </p>
              )}
            {session.selectedMap && (
              <p className="mt-2 text-sm">
                {t("map")}{" "}
                {RANKED_MAP_LABELS[session.selectedMap as keyof typeof RANKED_MAP_LABELS] ??
                  session.selectedMap}
              </p>
            )}
            {session.serverHost && session.serverPort && (
              <div className="mt-4">
                <ServerConnectActions host={session.serverHost} port={session.serverPort} size="md" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
