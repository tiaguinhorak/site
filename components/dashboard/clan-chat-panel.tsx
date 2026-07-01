"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { SocialUserName } from "@/components/social/social-user-name";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { toSocialUserView, type SerializedSocialUser } from "@/lib/profile/social-user";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ClanMessage = SerializedSocialUser & {
  id: string;
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
            const view = toSocialUserView(msg);
            return (
              <div
                key={msg.id}
                className={cn("flex gap-2.5", isYou ? "flex-row-reverse" : "flex-row")}
              >
                <UserProfileAvatar
                  avatarUrl={view.avatarUrl}
                  nickname={view.nickname}
                  customization={view.customization}
                  size="sm"
                />
                <div className={cn("min-w-0 max-w-[min(100%,20rem)]", isYou && "items-end")}>
                  {!isYou && (
                    <SocialUserName
                      user={view}
                      link
                      showPlanBadge
                      nameClassName="text-[11px] font-semibold"
                    />
                  )}
                  <div
                    className={cn(
                      "mt-0.5 rounded-2xl px-3 py-2 text-sm",
                      isYou
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  </div>
                  <p className="mt-0.5 px-1 font-mono text-[10px] text-muted">
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

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          type="text"
          value={draft}
          maxLength={400}
          placeholder={t("placeholder")}
          onChange={(e) => setDraft(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={sending || !draft.trim()}
          aria-label={t("send")}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
