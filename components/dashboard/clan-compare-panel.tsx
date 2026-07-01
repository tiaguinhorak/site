"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AvatarImage } from "@/components/ui/avatar-image";
import { EloRankBadgeI18n } from "@/components/ranked/elo-rank-badge-i18n";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

type ClanStats = {
  memberCount: number;
  totalPoints: number;
  totalXp: number;
  totalKills: number;
  totalWins: number;
  totalMvps: number;
  avgElo: number;
};

type CompareClan = {
  id: string;
  tag: string;
  name: string;
  avatarUrl: string | null;
  stats: ClanStats;
};

function CompareStat({
  label,
  mine,
  theirs,
  format = (v: number) => v.toLocaleString("pt-BR"),
}: {
  label: string;
  mine: number;
  theirs: number;
  format?: (v: number) => string;
}) {
  const mineWins = mine > theirs;
  const theirsWins = theirs > mine;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-border px-3 py-2.5">
      <p
        className={cn(
          "text-right font-mono text-sm font-bold",
          mineWins ? "text-emerald-400" : "text-foreground",
        )}
      >
        {format(mine)}
      </p>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-sm font-bold",
          theirsWins ? "text-emerald-400" : "text-foreground",
        )}
      >
        {format(theirs)}
      </p>
    </div>
  );
}

export function ClanComparePanel({
  myClan,
  otherClanId,
  onClose,
}: {
  myClan: CompareClan;
  otherClanId: string;
  onClose: () => void;
}) {
  const t = useTranslations("clans");
  const [other, setOther] = useState<CompareClan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clans/${otherClanId}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        const c = d.clan;
        if (!c) {
          setOther(null);
          return;
        }
        setOther({
          id: c.id,
          tag: c.tag,
          name: c.name,
          avatarUrl: c.avatarUrl,
          stats: c.stats,
        });
      })
      .catch(() => setOther(null))
      .finally(() => setLoading(false));
  }, [otherClanId]);

  const mineScore = myClan.stats.totalPoints;
  const otherScore = other?.stats.totalPoints ?? 0;
  const winner =
    mineScore > otherScore ? "mine" : mineScore < otherScore ? "other" : "tie";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border glass-strong shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            {t("compareTitle")}
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
          ) : !other ? (
            <p className="py-16 text-center text-muted">{t("clanNotFound")}</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[myClan, other].map((clan, idx) => (
                  <div
                    key={clan.id}
                    className={cn(
                      "rounded-xl border p-3 text-center",
                      winner === (idx === 0 ? "mine" : "other")
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border",
                    )}
                  >
                    <div className="mx-auto h-12 w-12 overflow-hidden rounded-xl border border-border">
                      <AvatarImage
                        src={clan.avatarUrl ?? getDefaultAvatarPresetUrl()}
                        alt=""
                        size={48}
                      />
                    </div>
                    <p className="mt-2 truncate font-display text-sm font-bold text-foreground">
                      [{clan.tag}] {clan.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {idx === 0 ? t("yourClan") : t("opponentClan")}
                    </p>
                  </div>
                ))}
              </div>

              {winner !== "tie" && (
                <p className="rounded-xl bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary">
                  {winner === "mine" ? t("compareYouWin") : t("compareTheyWin")}
                </p>
              )}

              <div className="space-y-2">
                <CompareStat label={t("points")} mine={myClan.stats.totalPoints} theirs={other.stats.totalPoints} />
                <CompareStat label={t("statWins")} mine={myClan.stats.totalWins} theirs={other.stats.totalWins} />
                <CompareStat label={t("statKills")} mine={myClan.stats.totalKills} theirs={other.stats.totalKills} />
                <CompareStat label={t("statMvps")} mine={myClan.stats.totalMvps} theirs={other.stats.totalMvps} />
                <CompareStat
                  label={t("statMembers")}
                  mine={myClan.stats.memberCount}
                  theirs={other.stats.memberCount}
                />
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-border px-3 py-2.5">
                  <div className="flex justify-end">
                    <EloRankBadgeI18n elo={myClan.stats.avgElo} size="sm" />
                  </div>
                  <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("avgElo")}
                  </p>
                  <EloRankBadgeI18n elo={other.stats.avgElo} size="sm" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
