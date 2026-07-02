"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Crown, Gift, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GiftModal } from "@/components/gifts/gift-modal";
import { PlanBadge } from "@/components/profile/plan-badge";
import { useUser } from "@/lib/hooks/use-user";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { cn } from "@/lib/utils";

type PlanCatalogItem = {
  id: string;
  slug: string;
  name: string;
  price: string;
  period: string;
  highlight: boolean;
  badge?: string;
  features: string[];
  cta: string;
  storeItemId: string | null;
  storePrice: string;
  storePriceCents: number | null;
  coinPrice: number | null;
  canBuyWithCoins: boolean;
  grantPlan: string | null;
};

const PLAN_ACCENT: Record<string, string> = {
  free: "from-slate-500/30 to-slate-700/10",
  premium: "from-violet-500/35 to-fuchsia-500/10",
  elite: "from-amber-500/35 to-orange-500/10",
};

export function PlansSection({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("plans");
  const tStore = useTranslations("store");
  const { user, refresh } = useUser();
  const confirmPresets = useConfirmPresets();
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [giftItemId, setGiftItemId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/plans/catalog", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { plans: [] }))
      .then((json: { plans: PlanCatalogItem[] }) => setPlans(json.plans ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function buyPlan(plan: PlanCatalogItem) {
    if (!plan.storeItemId) return;
    setBusyId(plan.slug || plan.id);
    const result = await secureApi("/api/store/purchase", {
      method: "POST",
      json: { storeItemId: plan.storeItemId, currency: "brl" },
    });
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("purchaseSuccess", { plan: plan.name }));
    void refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center rounded-card glass p-16">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <section className={cn("relative", embedded ? "w-full min-w-0" : "py-8")}>
        <div className="grid w-full min-w-0 grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const currentPlan = user?.plan?.toLowerCase() ?? "free";
            const isCurrent = plan.slug === currentPlan;
            const isFree = plan.slug === "free";

            return (
              <motion.article
                key={plan.slug || plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className={cn(
                  "relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-5 sm:p-6",
                  plan.highlight
                    ? "border-[color-mix(in_srgb,var(--primary)_45%,transparent)] glass-strong shadow-[0_0_40px_-14px_var(--glow-1)]"
                    : "border-border/70 glass",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-40 blur-2xl",
                    PLAN_ACCENT[plan.slug] ?? PLAN_ACCENT.free,
                  )}
                  aria-hidden
                />

                {plan.badge && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
                    {plan.badge}
                  </span>
                )}

                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {plan.highlight && <Crown className="h-5 w-5 text-primary" />}
                      <h3 className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
                        {plan.name}
                      </h3>
                    </div>
                    <div className="mt-3 flex flex-wrap items-baseline gap-1">
                      <span className="font-display text-4xl font-bold text-foreground">
                        {plan.storePriceCents != null ? plan.storePrice : plan.price}
                      </span>
                      <span className="text-sm text-muted">{plan.period}</span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      {t("currentPlan")}
                    </span>
                  )}
                </div>

                {plan.grantPlan && (
                  <div className="relative mt-3">
                    <PlanBadge plan={plan.grantPlan.toLowerCase() as "premium" | "elite"} />
                  </div>
                )}

                <ul className="relative mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={`${plan.slug}-feature-${featureIndex}`} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative mt-6 space-y-2">
                  {isFree ? (
                    <Button variant="outline" size="md" className="w-full" disabled={isCurrent}>
                      {isCurrent ? t("currentPlan") : plan.cta}
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant={plan.highlight ? "primary" : "outline"}
                        size="md"
                        className="w-full"
                        disabled={!plan.storeItemId || isCurrent || busyId === (plan.slug || plan.id)}
                        confirm={
                          plan.storeItemId && !isCurrent
                            ? confirmPresets.purchaseItem(plan.name, plan.storePrice)
                            : undefined
                        }
                        onClick={() => void buyPlan(plan)}
                      >
                        {busyId === (plan.slug || plan.id) ? (
                          <Loader2 className="h-4 w-4 motion-safe-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {isCurrent ? t("currentPlan") : plan.cta}
                      </Button>
                      {plan.storeItemId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          className="w-full"
                          onClick={() => setGiftItemId(plan.storeItemId)}
                        >
                          <Gift className="h-4 w-4" />
                          {t("giftPlan")}
                        </Button>
                      )}
                      {plan.canBuyWithCoins && plan.coinPrice && (
                        <p className="text-center text-xs text-muted">
                          {tStore("coinsLabel")}: {plan.coinPrice.toLocaleString("pt-BR")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {giftItemId && (
        <GiftModal
          presetItemId={giftItemId}
          presetMode="item"
          onClose={() => setGiftItemId(null)}
          onDone={() => void refresh()}
        />
      )}
    </>
  );
}
