"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { AvatarImage } from "@/components/ui/avatar-image";
import { Button } from "@/components/ui/button";
import { SocialUserName } from "@/components/social/social-user-name";
import { secureApi } from "@/lib/api/client";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ClanMessage = {
  id: string;
  userId: string;
  nickname: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
};

export function ClanChatPanel({
  clanId,
  currentUserId,
}: {
  clanId: string;
  currentUserId: string;
}) {
  const t = useTranslations("clans.chat");
  const [messages, setMessages] = useState<ClanMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    fetch(`/api/clans/${clanId}/chat`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [clanId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const result = await secureApi(`/api/clans/${clanId}/chat`, {
      method: "POST",
      json: { body },
    });
    setSending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDraft("");
    load();
  }

  return (
    <div className="flex h-[min(28rem,60vh)] flex-col overflow-hidden rounded-card glass">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold text-foreground">{t("title")}</h3>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          messages.map((msg) => {
            const isYou = msg.userId === currentUserId;
            return (
              <div
                key={msg.id}
                className={cn("flex gap-2.5", isYou ? "flex-row-reverse" : "flex-row")}
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border">
                  <AvatarImage
                    src={msg.avatarUrl ?? getDefaultAvatarPresetUrl()}
                    alt=""
                    size={32}
                  />
                </div>
                <div
                  className={cn(
                    "max-w-[min(100%,20rem)] rounded-xl px-3 py-2",
                    isYou
                      ? "bg-primary/15 text-foreground"
                      : "bg-black/25 text-foreground",
                  )}
                >
                  <p className="mb-0.5 text-[11px] font-semibold text-primary">
                    <SocialUserName user={msg} nameClassName="text-[11px]" />
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{msg.body}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        <input
          type="text"
          value={draft}
          maxLength={400}
          placeholder={t("placeholder")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={sending || !draft.trim()}
          onClick={() => void handleSend()}
          aria-label={t("send")}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
