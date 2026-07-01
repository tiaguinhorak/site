"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { GlassPortal } from "@/components/ui/glass-portal";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { SocialUserName } from "@/components/social/social-user-name";
import { useFriendsOptional } from "@/components/providers/friends-provider";
import { cn } from "@/lib/utils";

export function FriendsMenu() {
  const friends = useFriendsOptional();
  const t = useTranslations("friends.menu");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (!friends) return null;

  const { friends: list, isOnline, totalUnread, incomingCount, openChat } = friends;
  const sorted = [...list].sort((a, b) => {
    const ao = isOnline(a.id) ? 0 : 1;
    const bo = isOnline(b.id) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return a.displayName.localeCompare(b.displayName);
  });
  const onlineCount = list.filter((f) => isOnline(f.id)).length;
  const badge = totalUnread + incomingCount;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl glass-chip text-foreground transition-colors hover:glow-ring-contained"
        aria-label={t("ariaLabel")}
        aria-expanded={open}
      >
        <Users className="h-5 w-5" />
        {onlineCount > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border-2 border-background bg-emerald-500 px-1 text-[8px] font-bold text-white">
            {onlineCount > 9 ? "9+" : onlineCount}
          </span>
        )}
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      <GlassPortal
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        align="right"
        width={320}
      >
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
          <p className="font-display text-sm font-bold text-foreground">
            {t("title")}
            <span className="ml-2 text-xs font-normal text-emerald-300">
              {t("onlineCount", { count: onlineCount })}
            </span>
          </p>
        </div>

        {incomingCount > 0 && (
          <Link
            href="/dashboard/amigos"
            onClick={() => setOpen(false)}
            className="block border-b border-border/80 bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-4 py-2.5 text-xs font-semibold text-primary hover:underline"
          >
            {t("requests", { count: incomingCount })}
          </Link>
        )}

        <ul className="max-h-[min(65vh,360px)] overflow-y-auto py-1">
          {sorted.map((friend) => {
            const online = isOnline(friend.id);
            const unread = friends.unread[friend.id] ?? 0;
            return (
              <li key={friend.id}>
                <button
                  type="button"
                  onClick={() => {
                    openChat(friend.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
                >
                  <div className="relative shrink-0">
                    <UserProfileAvatar
                      avatarUrl={friend.avatarUrl}
                      nickname={friend.nickname}
                      customization={friend.customization}
                      size="sm"
                    />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        online ? "bg-emerald-500" : "bg-zinc-500",
                      )}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <SocialUserName user={friend} nameClassName="text-sm font-semibold" />
                    <p
                      className={cn(
                        "text-[11px]",
                        online ? "text-emerald-300" : "text-muted",
                      )}
                    >
                      {online ? t("online") : t("offline")}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                  <MessageCircle className="h-4 w-4 shrink-0 text-muted" />
                </button>
              </li>
            );
          })}
          {sorted.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted">{t("empty")}</li>
          )}
        </ul>

        <div className="border-t border-border/80 px-4 py-2.5">
          <Link
            href="/dashboard/amigos"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-primary hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>
      </GlassPortal>
    </div>
  );
}
