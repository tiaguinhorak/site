"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { SocialUserName } from "@/components/social/social-user-name";
import {
  useFriendsOptional,
  type FriendEntryLite,
} from "@/components/providers/friends-provider";
import { cn } from "@/lib/utils";

function ChatWindow({
  friend,
  minimized,
}: {
  friend: FriendEntryLite;
  minimized: boolean;
}) {
  const friends = useFriendsOptional();
  const t = useTranslations("friends.chat");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = friends?.threads[friend.id] ?? [];
  const loading = friends?.loadingThread[friend.id] ?? false;
  const online = friends?.isOnline(friend.id) ?? false;

  useEffect(() => {
    if (minimized) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading, minimized]);

  if (!friends) return null;

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const ok = await friends!.sendMessage(friend.id, body);
    setSending(false);
    if (ok) setDraft("");
  }

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => friends.toggleMinimizeChat(friend.id)}
        className="pointer-events-auto flex h-10 max-w-[12rem] items-center gap-2 rounded-t-xl border border-border glass-strong px-3 shadow-lg transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
        aria-label={t("restoreChat", { nickname: friend.displayName })}
      >
        <UserProfileAvatar
          avatarUrl={friend.avatarUrl}
          nickname={friend.nickname}
          customization={friend.customization}
          size="sm"
        />
        <span className="truncate text-sm font-semibold text-foreground">{friend.displayName}</span>
        {(friends.unread[friend.id] ?? 0) > 0 && (
          <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {friends.unread[friend.id]}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto flex h-[26rem] w-[20rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-t-2xl border border-border glass-strong shadow-2xl">
      <div className="flex items-center gap-2.5 border-b border-border/80 px-3 py-2.5">
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
          <SocialUserName user={friend} nameClassName="text-sm font-bold" />
          <p className={cn("text-[11px]", online ? "text-emerald-300" : "text-muted")}>
            {online ? t("onlineNow") : t("offlineNow")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => friends!.toggleMinimizeChat(friend.id)}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
          aria-label={t("minimizeChat")}
          title={t("minimizeChat")}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => friends!.closeChat(friend.id)}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
          aria-label={t("closeChat")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 motion-safe-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted">
            {t("empty", { nickname: friend.displayName })}
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.mine ? "justify-end" : "justify-start")}
            >
              <span
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm",
                  m.mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-foreground",
                )}
              >
                {m.body}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/80 p-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder={t("placeholder", { nickname: friend.displayName })}
          maxLength={1000}
          className="h-9 flex-1 rounded-xl border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!draft.trim() || sending}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          aria-label={t("send")}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export function FriendsChatDock() {
  const friends = useFriendsOptional();
  if (!friends) return null;

  const { openChats, minimizedChats, friends: list } = friends;
  if (openChats.length === 0) return null;

  const windows = openChats
    .map((id) => list.find((f) => f.id === id))
    .filter((f): f is FriendEntryLite => Boolean(f));

  return (
    <div className="pointer-events-none fixed bottom-0 right-4 z-[95] flex items-end gap-3">
      {windows.map((friend) => (
        <ChatWindow
          key={friend.id}
          friend={friend}
          minimized={minimizedChats.has(friend.id)}
        />
      ))}
    </div>
  );
}
