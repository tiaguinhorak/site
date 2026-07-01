"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, Swords, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RankedTeamRoster } from "@/components/ranked/ranked-team-roster";
import { SocialUserName } from "@/components/social/social-user-name";
import { RankedFlowStepper } from "@/components/ranked/ranked-flow-stepper";
import type { RankedMatchSessionView } from "@/lib/ranked/party-shared";
import { ModalPortal } from "@/components/ui/modal-portal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  session: RankedMatchSessionView;
  onAccept: () => void;
  onCancel?: () => void;
  cancelLoading?: boolean;
  onClose: () => void;
};

export function RankedAcceptModal({
  open,
  session,
  onAccept,
  onCancel,
  cancelLoading,
  onClose,
}: Props) {
  const t = useTranslations("ranked.acceptModal");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const progress = Math.min(
    100,
    Math.round((session.acceptedCount / Math.max(1, session.requiredCount)) * 100),
  );

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
          aria-labelledby="ranked-accept-title"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-[121] w-full max-w-3xl overflow-hidden rounded-2xl glass-modal shadow-2xl"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-primary to-fuchsia-500"
            aria-hidden
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                  <Swords className="h-6 w-6" />
                </div>
                <div>
                  <p
                    id="ranked-accept-title"
                    className="font-display text-xl font-bold text-foreground sm:text-2xl"
                  >
                    {t("title")}
                  </p>
                  <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
                </div>
              </div>
              <RankedFlowStepper current="accepting" />
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span>
                  {t("confirmed", {
                    accepted: session.acceptedCount,
                    required: session.requiredCount,
                  })}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <RankedTeamRoster
                title={t("teamAlpha")}
                members={session.partyA.members}
                accent="violet"
              />
              <RankedTeamRoster
                title={t("teamBravo")}
                members={session.partyB.members}
                accent="cyan"
              />
            </div>

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {session.acceptances.map((a) => (
                <li
                  key={a.userId}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    a.accepted
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-border/60 bg-black/10",
                  )}
                >
                  {a.accepted ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Loader2 className="h-4 w-4 shrink-0 motion-safe-spin text-muted" />
                  )}
                  <span className="truncate">
                    <SocialUserName user={a} suffix={a.isYou ? ` ${t("you")}` : undefined} />
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
              {onCancel && (
                <Button
                  variant="outline"
                  size="md"
                  disabled={cancelLoading}
                  onClick={onCancel}
                >
                  {cancelLoading ? (
                    <Loader2 className="h-4 w-4 motion-safe-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {t("cancel")}
                </Button>
              )}
              {!session.youAccepted ? (
                <Button variant="primary" size="lg" onClick={onAccept}>
                  {t("ready")}
                </Button>
              ) : (
                <p className="flex items-center justify-center gap-2 text-sm text-emerald-300 sm:mr-auto">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("waitingOthers")}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </ModalPortal>
  );
}
