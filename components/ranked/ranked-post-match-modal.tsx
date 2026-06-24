"use client";

import { Loader2, RefreshCw, Shuffle, LogOut, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { RankedMatchSessionView } from "@/lib/ranked/party-shared";

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

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4">
      <button
        type="button"
        className="scrim-dim absolute inset-0 cursor-default"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl glass-modal p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t("eyebrow")}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">{t("title")}</h2>
            <p className="mt-2 text-sm text-muted">
              {t("description")}
            </p>
          </div>
          <Swords className="h-6 w-6 shrink-0 text-primary" />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted">{t("teamA")}</p>
            <p className="font-semibold">{t("players", { count: session.partyA.memberCount })}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted">{t("teamB")}</p>
            <p className="font-semibold">{t("players", { count: session.partyB.memberCount })}</p>
          </div>
        </div>

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
  );
}
