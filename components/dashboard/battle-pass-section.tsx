"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Coins, Crown, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Track = "FREE" | "PREMIUM";

type Reward = {
  id: string;
  level: number;
  track: Track;
  rewardType: string;
  label: string;
  icon: string | null;
  amountCoins: number;
  claimable: boolean;
  claimed: boolean;
  locked: boolean;
};

type BattlePass = {
  season: {
    id: string;
    name: string;
    seasonNumber: number;
    maxLevel: number;
    xpPerLevel: number;
    premiumCostCoins: number;
    endsAt: string | null;
  };
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  premium: boolean;
  rewards: Reward[];
};

function RewardCell({
  reward,
  claimingId,
  onClaim,
}: {
  reward: Reward;
  claimingId: string | null;
  onClaim: (reward: Reward) => void;
}) {
  const t = useTranslations("battlePass");
  const claiming = claimingId === reward.id;

  return (
    <button
      type="button"
      disabled={!reward.claimable || claiming}
      onClick={() => onClaim(reward)}
      className={cn(
        "flex w-full flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors",
        reward.claimed
          ? "border-emerald-500/40 bg-emerald-500/10"
          : reward.claimable
            ? "border-primary/50 bg-primary/10 hover:bg-primary/20"
            : "border-border/50 bg-black/20",
        !reward.claimable && !reward.claimed && "opacity-70",
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
        {reward.locked ? <Lock className="h-4 w-4 text-muted" /> : <Coins className="h-4 w-4" />}
      </span>
      <span className="text-xs font-medium text-foreground">{reward.label}</span>
      {claiming ? (
        <Loader2 className="h-3.5 w-3.5 motion-safe-spin text-primary" />
      ) : reward.claimed ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-400">
          <Check className="h-3 w-3" />
          {t("claimed")}
        </span>
      ) : reward.claimable ? (
        <span className="text-[10px] font-semibold uppercase text-primary">{t("claim")}</span>
      ) : null}
    </button>
  );
}

export function BattlePassSection() {
  const t = useTranslations("battlePass");
  const { user, refresh } = useUser();
  const confirmPresets = useConfirmPresets();
  const [data, setData] = useState<BattlePass | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/battlepass", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setData(d.battlePass ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClaim(reward: Reward) {
    if (claimingId) return;
    setClaimingId(reward.id);
    const result = await secureApi("/api/battlepass/claim/" + reward.id, { method: "POST" });
    setClaimingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("claimedToast"));
    load();
    void refresh();
  }

  async function handleBuyPremium() {
    if (buying) return;
    setBuying(true);
    const result = await secureApi("/api/battlepass/premium", { method: "POST" });
    setBuying(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("premiumActivated"));
    load();
    void refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center rounded-card glass p-12">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-card glass p-8 text-center text-muted">{t("noSeason")}</div>
    );
  }

  const levels = Array.from(new Set(data.rewards.map((r) => r.level))).sort((a, b) => a - b);
  const byLevelTrack = new Map<string, Reward>();
  for (const r of data.rewards) byLevelTrack.set(`${r.level}-${r.track}`, r);
  const progressPct = Math.min(100, Math.round((data.xpIntoLevel / data.xpPerLevel) * 100));

  return (
    <div className="space-y-6">
      <div className="rounded-card glass-strong p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-xl font-bold text-foreground">{data.season.name}</p>
            <p className="mt-1 text-sm text-muted">
              {t("levelLabel", { level: data.level, max: data.season.maxLevel })}
            </p>
          </div>
          {data.premium ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-300">
              <Crown className="h-4 w-4" />
              {t("premiumActive")}
            </span>
          ) : (
            <Button
              type="button"
              variant="primary"
              disabled={buying}
              confirm={confirmPresets.purchaseItem(
                t("premiumName"),
                `${data.season.premiumCostCoins.toLocaleString("pt-BR")} ${t("coins")}`,
              )}
              onClick={handleBuyPremium}
            >
              {buying ? (
                <Loader2 className="h-4 w-4 motion-safe-spin" />
              ) : (
                <>
                  <Crown className="h-4 w-4" />
                  {t("buyPremium", { coins: data.season.premiumCostCoins.toLocaleString("pt-BR") })}
                </>
              )}
            </Button>
          )}
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-muted">
          {data.xpIntoLevel.toLocaleString("pt-BR")} / {data.xpPerLevel.toLocaleString("pt-BR")} XP
          {user ? ` · ${t("walletShort", { coins: user.coins.toLocaleString("pt-BR") })}` : ""}
        </p>
      </div>

      <div className="overflow-x-auto rounded-card glass p-4">
        <div className="flex gap-3">
          {levels.map((level) => {
            const free = byLevelTrack.get(`${level}-FREE`);
            const premium = byLevelTrack.get(`${level}-PREMIUM`);
            const reached = data.level >= level;
            return (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-28 shrink-0 flex-col gap-2"
              >
                <div
                  className={cn(
                    "rounded-lg py-1 text-center text-xs font-bold",
                    reached ? "bg-primary/20 text-primary" : "bg-black/20 text-muted",
                  )}
                >
                  {t("levelShort", { level })}
                </div>
                <p className="text-center text-[10px] uppercase tracking-wider text-muted">
                  {t("trackFree")}
                </p>
                {free ? (
                  <RewardCell reward={free} claimingId={claimingId} onClaim={handleClaim} />
                ) : (
                  <div className="h-[88px] rounded-xl border border-dashed border-border/40" />
                )}
                <p className="text-center text-[10px] uppercase tracking-wider text-amber-300/80">
                  {t("trackPremium")}
                </p>
                {premium ? (
                  <RewardCell reward={premium} claimingId={claimingId} onClaim={handleClaim} />
                ) : (
                  <div className="h-[88px] rounded-xl border border-dashed border-border/40" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
