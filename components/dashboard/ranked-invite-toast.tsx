"use client";

import { AnimatePresence, motion } from "motion/react";
import { Swords, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { useFriendsOptional } from "@/components/providers/friends-provider";

export function RankedInviteToast() {
  const friends = useFriendsOptional();
  const t = useTranslations("friends.invite");

  const invite = friends?.incomingInvite ?? null;

  return (
    <AnimatePresence>
      {friends && invite && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-1/2 z-[110] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-violet-400/40 glass-strong shadow-2xl sm:left-4 sm:translate-x-0"
          role="alertdialog"
          aria-labelledby="ranked-invite-title"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-primary to-cyan-400"
            aria-hidden
          />
          <div className="flex items-start gap-3 p-4">
            <div className="relative shrink-0">
              <UserProfileAvatar
                avatarUrl={invite.fromAvatarUrl}
                nickname={invite.fromDisplayName}
                customization={null}
                size="md"
              />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white">
                <Swords className="h-3 w-3" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p
                id="ranked-invite-title"
                className="font-display text-sm font-bold text-foreground"
              >
                {t("incomingTitle")}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {t("incomingBody", {
                  nickname: invite.fromDisplayName,
                  party: invite.partyName,
                })}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="normal-case tracking-normal"
                  onClick={() => friends.acceptInvite()}
                >
                  <Swords className="h-4 w-4" />
                  {t("accept")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="normal-case tracking-normal"
                  onClick={() => friends.dismissInvite()}
                >
                  {t("decline")}
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => friends.dismissInvite()}
              className="rounded-lg p-1 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
              aria-label={t("decline")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
