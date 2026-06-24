"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessagesSquare, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import { useUser } from "@/lib/hooks/use-user";
import type { RankedPartyActivityType } from "@/lib/ranked/party-activity";
import { cn } from "@/lib/utils";

type FeedItem =
  | {
      kind: "system";
      id: string;
      type: RankedPartyActivityType;
      nickname: string;
      actor: string | null;
      at: number;
      iso: string;
    }
  | {
      kind: "message";
      id: string;
      userId: string;
      nickname: string;
      body: string;
      at: number;
      iso: string;
    };

export function RankedRoomChat({ className }: { className?: string }) {
  const { party, partyActivities, partyMessages, sendPartyMessage } = useRankedParty();
  const { user } = useUser();
  const t = useTranslations("ranked.chat");
  const locale = useLocale();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...partyActivities.map((a) => ({
        kind: "system" as const,
        id: `a-${a.id}`,
        type: a.type,
        nickname: a.nickname,
        actor: a.actorNickname,
        at: new Date(a.createdAt).getTime(),
        iso: a.createdAt,
      })),
      ...partyMessages.map((m) => ({
        kind: "message" as const,
        id: `m-${m.id}`,
        userId: m.userId,
        nickname: m.nickname,
        body: m.body,
        at: new Date(m.createdAt).getTime(),
        iso: m.createdAt,
      })),
    ];
    return items.sort((a, b) => a.at - b.at);
  }, [partyActivities, partyMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed.length]);

  function systemText(item: Extract<FeedItem, { kind: "system" }>): string {
    switch (item.type) {
      case "kicked":
        return item.actor
          ? t("system.kickedBy", { nickname: item.nickname, actor: item.actor })
          : t("system.kicked", { nickname: item.nickname });
      case "created":
      case "joined":
      case "left":
        return t(`system.${item.type}`, { nickname: item.nickname });
      case "disbanded":
        return t("system.disbanded", { nickname: item.nickname });
      default: {
        const _exhaustive: never = item.type;
        return _exhaustive;
      }
    }
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleSend() {
    const value = draft.trim();
    if (!value || sending) return;
    setSending(true);
    const ok = await sendPartyMessage(value);
    setSending(false);
    if (ok) setDraft("");
  }

  return (
    <div className={cn("flex flex-col rounded-card glass-strong border border-border", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessagesSquare className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold text-foreground">{t("title")}</h3>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {!party ? (
          <p className="py-10 text-center text-xs text-muted">{t("noRoom")}</p>
        ) : feed.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted">{t("empty")}</p>
        ) : (
          feed.map((item) => {
            if (item.kind === "system") {
              return (
                <div key={item.id} className="flex justify-center">
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-3 py-1 text-[11px] text-muted">
                    {systemText(item)}
                    <span className="ml-2 font-mono opacity-60">{formatTime(item.iso)}</span>
                  </span>
                </div>
              );
            }
            const own = user?.id === item.userId;
            return (
              <div
                key={item.id}
                className={cn("flex flex-col", own ? "items-end" : "items-start")}
              >
                {!own && (
                  <span className="mb-0.5 px-1 text-[10px] font-semibold text-primary">
                    {item.nickname}
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    own
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{item.body}</p>
                </div>
                <span className="mt-0.5 px-1 font-mono text-[10px] text-muted">
                  {formatTime(item.iso)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          type="text"
          value={draft}
          disabled={!party || sending}
          maxLength={300}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("placeholder")}
          className="h-10 min-w-0 flex-1 rounded-xl glass-input px-3 text-sm outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!party || sending || !draft.trim()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label={t("send")}
        >
          {sending ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
