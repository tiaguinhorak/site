"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { SocialUserName } from "@/components/social/social-user-name";

type PendingAvatarGif = {
  id: string;
  nickname: string;
  displayName?: string;
  avatarUrl: string | null;
  avatarModerationStatus: string;
  plan: string;
  updatedAt: string;
};

type PendingBannerGif = {
  id: string;
  nickname: string;
  displayName?: string;
  profileBannerUrl: string | null;
  profileBannerModerationStatus: string;
  plan: string;
  updatedAt: string;
};

type ModerationTab = "avatars" | "banners";

export function AdminGifModerationSection() {
  const [tab, setTab] = useState<ModerationTab>("avatars");
  const [avatarItems, setAvatarItems] = useState<PendingAvatarGif[]>([]);
  const [bannerItems, setBannerItems] = useState<PendingBannerGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadAvatars = useCallback(async () => {
    const res = await fetch("/api/admin/moderation/avatars", {
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("Falha ao carregar avatares.");
    const data = (await res.json()) as { pending: PendingAvatarGif[] };
    setAvatarItems(data.pending);
  }, []);

  const loadBanners = useCallback(async () => {
    const res = await fetch("/api/admin/moderation/banners", {
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("Falha ao carregar banners.");
    const data = (await res.json()) as { pending: PendingBannerGif[] };
    setBannerItems(data.pending);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadAvatars(), loadBanners()]);
    } catch {
      toast.error("Não foi possível carregar a fila de moderação.");
    } finally {
      setLoading(false);
    }
  }, [loadAvatars, loadBanners]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderateAvatar(userId: string, action: "approve" | "reject") {
    setActingId(userId);
    const result = await secureApi("/api/admin/moderation/avatars", {
      method: "PATCH",
      json: { userId, action },
    });
    setActingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Falha na moderação.");
      return;
    }
    toast.success(action === "approve" ? "Avatar GIF aprovado." : "Avatar GIF rejeitado.");
    void loadAvatars();
  }

  async function moderateBanner(userId: string, action: "approve" | "reject") {
    setActingId(userId);
    const result = await secureApi("/api/admin/moderation/banners", {
      method: "PATCH",
      json: { userId, action },
    });
    setActingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Falha na moderação.");
      return;
    }
    toast.success(action === "approve" ? "Banner GIF aprovado." : "Banner GIF rejeitado.");
    void loadBanners();
  }

  const items = tab === "avatars" ? avatarItems : bannerItems;

  if (loading) {
    return (
      <div className="flex justify-center rounded-card glass p-12">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="rounded-card glass-strong p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <ImageIcon className="h-5 w-5 text-primary" />
            Moderação de GIFs
          </h2>
          <p className="mt-1 text-sm text-muted">
            Aprove ou rejeite avatares e banners animados enviados por usuários Elite.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Atualizar
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
            tab === "avatars"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-primary/40",
          )}
          onClick={() => setTab("avatars")}
        >
          Avatares ({avatarItems.length})
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
            tab === "banners"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-primary/40",
          )}
          onClick={() => setTab("banners")}
        >
          Banners ({bannerItems.length})
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          Nenhum {tab === "avatars" ? "avatar" : "banner"} GIF aguardando moderação.
        </p>
      ) : tab === "avatars" ? (
        <ul className="mt-6 space-y-4">
          {avatarItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <UserProfileAvatar
                  avatarUrl={item.avatarUrl}
                  nickname={item.nickname}
                  animated
                  size="md"
                />
                <div className="min-w-0">
                  <SocialUserName user={item} nameClassName="text-sm font-bold" showPlanBadge />
                  <p className="text-xs text-muted">
                    Plano {item.plan} ·{" "}
                    {new Date(item.updatedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={actingId === item.id}
                  onClick={() => void moderateAvatar(item.id, "approve")}
                >
                  {actingId === item.id ? (
                    <Loader2 className="h-4 w-4 motion-safe-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("border-rose-500/40 text-rose-400 hover:bg-rose-500/10")}
                  disabled={actingId === item.id}
                  onClick={() => void moderateAvatar(item.id, "reject")}
                >
                  <X className="h-4 w-4" />
                  Rejeitar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 space-y-4">
          {bannerItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/40 p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div>
                  <SocialUserName user={item} nameClassName="text-sm font-bold" showPlanBadge />
                  <p className="text-xs text-muted">
                    Plano {item.plan} ·{" "}
                    {new Date(item.updatedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={actingId === item.id}
                    onClick={() => void moderateBanner(item.id, "approve")}
                  >
                    {actingId === item.id ? (
                      <Loader2 className="h-4 w-4 motion-safe-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Aprovar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("border-rose-500/40 text-rose-400 hover:bg-rose-500/10")}
                    disabled={actingId === item.id}
                    onClick={() => void moderateBanner(item.id, "reject")}
                  >
                    <X className="h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              </div>
              {item.profileBannerUrl ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${item.profileBannerUrl.split("?")[0]}?v=${Date.now()}`}
                    alt=""
                    className="aspect-[16/5.6] w-full object-cover"
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
