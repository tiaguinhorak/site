"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, Unlock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AvatarImage } from "@/components/ui/avatar-image";
import { Button } from "@/components/ui/button";
import { EloRankBadgeI18n } from "@/components/ranked/elo-rank-badge-i18n";
import { SocialUserRow } from "@/components/social/social-user-row";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import type { SerializedSocialUser } from "@/lib/profile/social-user";

type ClanRole = "OWNER" | "OFFICER" | "MEMBER";

type ClanDetail = {
  id: string;
  tag: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  joinMode: "OPEN" | "CLOSED";
  stats: {
    memberCount: number;
    totalPoints: number;
    totalXp: number;
    totalKills: number;
    totalWins: number;
    totalMvps: number;
    avgElo: number;
  };
  members: (SerializedSocialUser & {
    role: ClanRole;
    points: number;
    kills: number;
    wins: number;
    mvps: number;
  })[];
};

export function ClanPublicSheet({
  clanId,
  myClanId,
  busy,
  onClose,
  onJoin,
}: {
  clanId: string;
  myClanId: string | null;
  busy: boolean;
  onClose: () => void;
  onJoin: (clanId: string) => void;
}) {
  const t = useTranslations("clans");
  const [clan, setClan] = useState<ClanDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clans/${clanId}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setClan(d.clan ?? null))
      .catch(() => setClan(null))
      .finally(() => setLoading(false));
  }, [clanId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border glass-strong shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
            {t("clanProfile")}
          </h2>
          <button
            type="button"
            aria-label={t("closeSheet")}
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-black/20 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
            </div>
          ) : !clan ? (
            <p className="py-16 text-center text-muted">{t("clanNotFound")}</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border">
                  <AvatarImage src={clan.avatarUrl ?? getDefaultAvatarPresetUrl()} alt="" size={64} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-bold text-foreground">
                    <span className="text-primary">[{clan.tag}]</span> {clan.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {clan.joinMode === "OPEN" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Unlock className="h-3 w-3" /> {t("joinModeOpen")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-300">
                        <Lock className="h-3 w-3" /> {t("joinModeClosed")}
                      </span>
                    )}
                    <span>{t("memberCount", { count: clan.stats.memberCount })}</span>
                    <EloRankBadgeI18n elo={clan.stats.avgElo} size="sm" />
                  </div>
                  {clan.description ? (
                    <p className="mt-2 text-sm text-muted">{clan.description}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { label: t("points"), value: clan.stats.totalPoints.toLocaleString("pt-BR") },
                  { label: t("statWins"), value: clan.stats.totalWins.toLocaleString("pt-BR") },
                  { label: t("statKills"), value: clan.stats.totalKills.toLocaleString("pt-BR") },
                  { label: t("statMvps"), value: clan.stats.totalMvps.toLocaleString("pt-BR") },
                  { label: t("avgElo"), value: null, elo: clan.stats.avgElo },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 font-display text-sm font-bold text-foreground">
                      {"elo" in stat && stat.elo != null ? (
                        <EloRankBadgeI18n elo={stat.elo} size="sm" />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <section>
                <h3 className="mb-3 font-display text-sm font-bold text-foreground">
                  {t("membersTitle")} ({clan.members.length})
                </h3>
                <ul className="space-y-2">
                  {clan.members.map((member) => (
                    <li
                      key={member.userId}
                      className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                    >
                      <SocialUserRow
                        user={member}
                        avatarSize="md"
                        link
                        showPlanBadge
                        className="min-w-0 flex-1"
                        subtitle={
                          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                            <span>
                              {member.points.toLocaleString("pt-BR")} {t("points")}
                            </span>
                            <span>·</span>
                            <EloRankBadgeI18n elo={member.elo} size="sm" />
                            <span>·</span>
                            <span>
                              {member.kills} kills · {member.wins} {t("statWins").toLowerCase()}
                            </span>
                          </p>
                        }
                      />
                      <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase text-muted">
                        {member.role === "OWNER"
                          ? t("roleOwner")
                          : member.role === "OFFICER"
                            ? t("roleOfficer")
                            : t("roleMember")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>

        {clan && !myClanId && (
          <div className="border-t border-border p-4">
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={busy}
              onClick={() => onJoin(clan.id)}
            >
              {clan.joinMode === "CLOSED" ? t("requestJoin") : t("join")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
