"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Coins, Crown, Loader2, Lock, Sparkles } from "lucide-react";
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
  track,
  claimingId,
  onClaim,
}: {
  reward: Reward;
  track: Track;
  claimingId: string | null;
  onClaim: (reward: Reward) => void;
}) {
  const t = useTranslations("battlePass");
  const claiming = claimingId === reward.id;
  const isPremium = track === "PREMIUM";

  return (
    <button
      type="button"
      disabled={!reward.claimable || claiming}
      onClick={() => onClaim(reward)}
      className={cn(
        "group flex w-full flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all sm:p-3",
        reward.claimed
          ? "border-emerald-500/40 bg-emerald-500/10"
          : reward.claimable
            ? isPremium
              ? "border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20"
              : "border-primary/50 bg-primary/10 hover:bg-primary/20"
            : "border-border/50 bg-black/20",
        !reward.claimable && !reward.claimed && "opacity-75",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg sm:h-10 sm:w-10",
          isPremium ? "badge-amber" : "bg-primary/15 text-primary",
        )}
      >
        {reward.locked ? (
          <Lock className="h-4 w-4 text-muted" />
        ) : isPremium ? (
          <Crown className="h-4 w-4" />
        ) : (
          <Coins className="h-4 w-4" />
        )}
      </span>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground sm:text-xs">
        {reward.label}
      </span>
      {claiming ? (
        <Loader2 className="h-3.5 w-3.5 motion-safe-spin text-primary" />
      ) : reward.claimed ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-400">
          <Check className="h-3 w-3" />
          {t("claimed")}
        </span>
      ) : reward.claimable ? (
        <span
          className={cn(
            "text-[10px] font-semibold uppercase",
            isPremium ? "text-amber-300" : "text-primary",
          )}
        >
          {t("claim")}
        </span>
      ) : null}
    </button>
  );
}

function LevelRow({
  level,
  free,
  premium,
  reached,
  claimingId,
  onClaim,
}: {
  level: number;
  free: Reward | undefined;
  premium: Reward | undefined;
  reached: boolean;
  claimingId: string | null;
  onClaim: (reward: Reward) => void;
}) {
  const t = useTranslations("battlePass");

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors sm:p-4",
        reached ? "border-primary/30 bg-primary/5" : "border-border/60 bg-black/15",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex min-w-[3rem] items-center justify-center rounded-lg px-2 py-1 font-display text-xs font-bold sm:text-sm",
            reached ? "bg-primary/20 text-primary" : "bg-black/25 text-muted",
          )}
        >
          {t("levelShort", { level })}
        </span>
        {reached && (
          <Sparkles className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div>
          <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t("trackFree")}
          </p>
          {free ? (
            <RewardCell reward={free} track="FREE" claimingId={claimingId} onClaim={onClaim} />
          ) : (
            <div className="h-[5.5rem] rounded-xl border border-dashed border-border/40 sm:h-[6rem]" />
          )}
        </div>
        <div>
          <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
            {t("trackPremium")}
          </p>
          {premium ? (
            <RewardCell
              reward={premium}
              track="PREMIUM"
              claimingId={claimingId}
              onClaim={onClaim}
            />
          ) : (
            <div className="h-[5.5rem] rounded-xl border border-dashed border-border/40 sm:h-[6rem]" />
          )}
        </div>
      </div>
    </div>
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const levels = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.rewards.map((r) => r.level))).sort((a, b) => a - b);
  }, [data]);

  const byLevelTrack = useMemo(() => {
    const map = new Map<string, Reward>();
    if (data) {
      for (const r of data.rewards) map.set(`${r.level}-${r.track}`, r);
    }
    return map;
  }, [data]);

  const claimableCount = useMemo(
    () => (data?.rewards ?? []).filter((r) => r.claimable).length,
    [data],
  );

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

  function scrollTrack(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -280 : 280, behavior: "smooth" });
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

  const progressPct = Math.min(100, Math.round((data.xpIntoLevel / data.xpPerLevel) * 100));
  const seasonProgressPct = Math.min(
    100,
    Math.round((data.level / data.season.maxLevel) * 100),
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="sticky top-0 z-10 rounded-card glass-strong p-4 shadow-lg backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-bold text-foreground sm:text-xl">
                {data.season.name}
              </p>
              {claimableCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  {t("claimableCount", { count: claimableCount })}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {t("levelLabel", { level: data.level, max: data.season.maxLevel })}
            </p>
            <div className="mt-3 space-y-2">
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>{t("currentLevelXp")}</span>
                  <span>
                    {data.xpIntoLevel.toLocaleString("pt-BR")} /{" "}
                    {data.xpPerLevel.toLocaleString("pt-BR")} XP
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/30">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft"
                    initial={false}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>{t("seasonProgress")}</span>
                  <span>{seasonProgressPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/20">
                  <div
                    className="h-full rounded-full bg-violet-500/70 transition-[width] duration-500"
                    style={{ width: `${seasonProgressPct}%` }}
                  />
                </div>
              </div>
            </div>
            {user ? (
              <p className="mt-2 text-xs text-muted">
                {t("walletShort", { coins: user.coins.toLocaleString("pt-BR") })}
              </p>
            ) : null}
          </div>

          <div className="shrink-0">
            {data.premium ? (
              <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl badge-amber px-4 py-2.5 text-sm sm:w-auto">
                <Crown className="h-4 w-4" />
                {t("premiumActive")}
              </span>
            ) : (
              <Button
                type="button"
                variant="primary"
                className="w-full sm:w-auto"
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
                    {t("buyPremium", {
                      coins: data.season.premiumCostCoins.toLocaleString("pt-BR"),
                    })}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile / tablet: vertical level cards */}
      <div className="grid gap-3 md:hidden">
        {levels.map((level) => (
          <LevelRow
            key={level}
            level={level}
            free={byLevelTrack.get(`${level}-FREE`)}
            premium={byLevelTrack.get(`${level}-PREMIUM`)}
            reached={data.level >= level}
            claimingId={claimingId}
            onClaim={handleClaim}
          />
        ))}
      </div>

      {/* Desktop: horizontal snap scroll with track labels */}
      <div className="relative hidden md:block">
        <div className="pointer-events-none absolute left-0 top-0 z-[1] flex h-full w-24 flex-col justify-center bg-gradient-to-r from-background to-transparent pl-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t("trackFree")}</p>
          <p className="mt-[4.5rem] text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
            {t("trackPremium")}
          </p>
        </div>

        <button
          type="button"
          aria-label={t("scrollLeft")}
          onClick={() => scrollTrack("left")}
          className="absolute left-0 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-lg transition-colors hover:bg-primary/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label={t("scrollRight")}
          onClick={() => scrollTrack("right")}
          className="absolute right-0 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-lg transition-colors hover:bg-primary/10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="overflow-x-auto rounded-card glass p-4 pl-24 scroll-smooth snap-x snap-mandatory"
        >
          <div className="flex min-w-min gap-3 pb-1">
            {levels.map((level) => {
              const free = byLevelTrack.get(`${level}-FREE`);
              const premium = byLevelTrack.get(`${level}-PREMIUM`);
              const reached = data.level >= level;
              return (
                <motion.div
                  key={level}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex w-32 shrink-0 snap-center flex-col gap-2 lg:w-36"
                >
                  <div
                    className={cn(
                      "rounded-lg py-1.5 text-center text-xs font-bold",
                      reached ? "bg-primary/20 text-primary" : "bg-black/20 text-muted",
                    )}
                  >
                    {t("levelShort", { level })}
                  </div>
                  {free ? (
                    <RewardCell
                      reward={free}
                      track="FREE"
                      claimingId={claimingId}
                      onClaim={handleClaim}
                    />
                  ) : (
                    <div className="h-[5.5rem] rounded-xl border border-dashed border-border/40" />
                  )}
                  {premium ? (
                    <RewardCell
                      reward={premium}
                      track="PREMIUM"
                      claimingId={claimingId}
                      onClaim={handleClaim}
                    />
                  ) : (
                    <div className="h-[5.5rem] rounded-xl border border-dashed border-border/40" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
