"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Crown } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { confirmPresets } from "@/lib/confirm-presets";
import { useUser } from "@/lib/hooks/use-user";

export function UpgradeSection() {
  const { user } = useUser();
  const [plan, setPlan] = useState<{
    name: string;
    price: string;
    period: string;
    perks: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/marketing/plans")
      .then((r) => r.json())
      .then((d) => {
        const premium = (d.plans ?? []).find(
          (p: { name: string }) => p.name === "Premium",
        );
        if (premium) {
          setPlan({
            name: premium.name,
            price: premium.price,
            period: premium.period,
            perks: premium.features,
          });
        }
      });
  }, []);

  if (user && (user.plan === "premium" || user.plan === "elite")) {
    return null;
  }

  if (!plan) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-card glass-strong p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Crown className="h-5 w-5" />
            <span className="font-display text-sm font-semibold uppercase tracking-wider">
              Upgrade
            </span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground">
            {plan.name} — {plan.price}
            <span className="text-lg text-muted">{plan.period}</span>
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {plan.perks.map((perk) => (
              <li key={perk}>• {perk}</li>
            ))}
          </ul>
        </div>
        <ButtonLink
          href="/dashboard/premium"
          variant="primary"
          size="lg"
          className="shrink-0"
          confirm={confirmPresets.subscribePremium(plan.name)}
        >
          Assinar {plan.name}
        </ButtonLink>
      </div>
    </motion.section>
  );
}
