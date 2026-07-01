"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MapThumbnail } from "@/components/ui/map-thumbnail";
import { ServerConnectActions } from "@/components/ui/server-connect-actions";
import type { RankedMatchSessionView } from "@/lib/ranked/party-shared";
import { formatMapLabel } from "@/lib/servers/maps";
import { RankedFlowStepper } from "@/components/ranked/ranked-flow-stepper";
import { ModalPortal } from "@/components/ui/modal-portal";

type Props = {
  open: boolean;
  session: RankedMatchSessionView;
  onClose: () => void;
  onFinish?: () => void;
  finishLoading?: boolean;
};

export function RankedConnectModal({ open, session, onClose, onFinish, finishLoading }: Props) {
  const t = useTranslations("ranked.connectModal");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !session.serverHost || !session.serverPort) return null;

  const selectedMap = session.selectedMap ?? "";
  const mapLabel = selectedMap ? formatMapLabel(selectedMap) : t("mapDefined");

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
        aria-labelledby="ranked-connect-title"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-[121] w-full max-w-lg overflow-hidden rounded-2xl glass-modal shadow-2xl"
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
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400"
          aria-hidden
        />

        <div className="p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p id="ranked-connect-title" className="font-display text-xl font-bold text-foreground">
                  {t("ready")}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                  {selectedMap ? (
                    <MapThumbnail mapId={selectedMap} label={mapLabel} size={28} rounded="md" />
                  ) : null}
                  {mapLabel}
                </p>
              </div>
            </div>
            <RankedFlowStepper
              current={session.status === "live" ? "live" : "starting"}
            />
          </div>

          <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
            <p className="mb-3 text-sm font-medium text-foreground">{t("connectLabel")}</p>
            <ServerConnectActions
              host={session.serverHost}
              port={session.serverPort}
              size="md"
            />
            {session.connectCommand && (
              <p className="mt-3 font-mono text-xs text-muted">{session.connectCommand}</p>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted">
            {t("notified")}
          </p>

          {onFinish && (
            <Button
              variant="ghost"
              size="md"
              className="mt-4 w-full text-muted"
              disabled={finishLoading}
              onClick={onFinish}
            >
              {finishLoading ? t("finishing") : t("finish")}
            </Button>
          )}

          <Button variant="outline" size="md" className="mt-2 w-full" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </motion.div>
    </div>
    </ModalPortal>
  );
}
