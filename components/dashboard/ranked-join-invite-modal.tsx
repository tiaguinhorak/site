"use client";

import { useEffect, useState } from "react";
import { Loader2, Ticket, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import { ModalPortal } from "@/components/ui/modal-portal";

type Props = {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
};

export function RankedJoinInviteModal({ open, onClose, initialCode = "" }: Props) {
  const { joinParty, pausePolling, resumePolling } = useRankedParty();
  const t = useTranslations("ranked.inviteJoin");
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    pausePolling();
    return () => resumePolling();
  }, [open, pausePolling, resumePolling]);

  useEffect(() => {
    if (open) {
      setCode(initialCode);
      setError(null);
    }
  }, [open, initialCode]);

  async function handleJoin() {
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      setError(t("error"));
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await joinParty(trimmed);
    setBusy(false);
    if (ok) onClose();
    else setError(t("error"));
  }

  return (
    <AnimatePresence>
      {open && (
        <ModalPortal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center"
          >
            <button
              type="button"
              className="absolute inset-0 scrim-dim"
              aria-label={t("cancel")}
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border glass-modal shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                  <Ticket className="h-4 w-4 text-primary" />
                  {t("title")}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-muted hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 px-5 py-4">
                <p className="text-sm text-muted">{t("description")}</p>
                <Input
                  label={t("codeLabel")}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("codePlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleJoin();
                  }}
                  autoFocus
                />
                {error && (
                  <p
                    className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="ghost" size="md" className="normal-case tracking-normal" onClick={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="normal-case tracking-normal"
                  disabled={busy || code.trim().length < 4}
                  onClick={() => void handleJoin()}
                >
                  {busy ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : t("join")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
}
