"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Unlink, CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import type { UserProfile } from "@/lib/serializers";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ProfileDiscordSectionProps = {
  profile: Pick<
    UserProfile,
    "discordLinked" | "discordUsername" | "discordLinkedAt" | "plan"
  >;
  onUpdate: (user: UserProfile) => void;
  initialCode?: string | null;
};

function formatLinkedAt(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProfileDiscordSection({
  profile,
  onUpdate,
  initialCode,
}: ProfileDiscordSectionProps) {
  const t = useTranslations("discordSection");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(initialCode ?? "");
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const linkedDate = formatLinkedAt(profile.discordLinkedAt);

  const clearDiscordLinkParam = useCallback((): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("discord_link");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const submitLink = useCallback(
    async (rawCode: string): Promise<boolean> => {
      const trimmed = rawCode.trim();
      if (trimmed.length < 4) {
        toast.error(t("invalidCode"));
        return false;
      }

      setLinking(true);
      const result = await secureApi<{ user: UserProfile }>("/api/discord/link", {
        method: "POST",
        json: { code: trimmed },
      });
      setLinking(false);

      if (!result.ok) {
        toast.error(result.error);
        return false;
      }

      onUpdate(result.data.user);
      setCode("");
      clearDiscordLinkParam();
      toast.success(t("linkedSuccess"));
      return true;
    },
    [t, onUpdate, clearDiscordLinkParam],
  );

  async function handleLink(): Promise<void> {
    await submitLink(code);
  }

  useEffect(() => {
    const trimmed = initialCode?.trim();
    if (!trimmed || profile.discordLinked) return;

    const storageKey = `discord-link-attempt:${trimmed}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(storageKey)) return;
    if (typeof window !== "undefined") sessionStorage.setItem(storageKey, "1");

    setCode(trimmed.toUpperCase());
    void submitLink(trimmed);
  }, [initialCode, profile.discordLinked, submitLink]);

  async function handleUnlink() {
    setUnlinking(true);
    const result = await secureApi<{ user: UserProfile }>("/api/discord/link", {
      method: "DELETE",
    });
    setUnlinking(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    onUpdate(result.data.user);
    toast.success(t("unlinkedSuccess"));
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2] text-white ring-1 ring-border">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted">{t("desc")}</p>
        </div>
      </div>

      {profile.discordLinked ? (
        <div className="rounded-xl glass border border-emerald-400/30 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="font-medium text-foreground">
                  {t("linkedAs", { username: profile.discordUsername ?? "Discord" })}
                </p>
                {linkedDate && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    {t("linkedAt", { date: linkedDate })}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted">{t("rolesHint")}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={unlinking}
              onClick={handleUnlink}
              className="shrink-0"
            >
              <Unlink className="h-4 w-4" />
              {unlinking ? t("unlinking") : t("unlink")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl glass p-5">
          <p className="text-sm text-muted">{t("howTo")}</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder={t("codePlaceholder")}
              className={cn(
                "h-11 flex-1 rounded-xl border border-border bg-background px-4 font-mono text-sm uppercase tracking-widest text-foreground outline-none ring-primary focus:ring-2",
              )}
              maxLength={16}
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={linking}
              onClick={handleLink}
              className="shrink-0"
            >
              {linking ? t("linking") : t("link")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
