"use client";

import { motion } from "motion/react";
import { Check, Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { AmbientGlow } from "@/components/ui/ambient";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { cn } from "@/lib/utils";

export type PlanView = {
  name: string;
  price: string;
  period: string;
  highlight: boolean;
  badge?: string;
  features: string[];
  cta: string;
};

export function Premium({
  embedded = false,
  plans,
}: {
  embedded?: boolean;
  plans: PlanView[];
}) {
  const t = useTranslations("marketing");
  const confirmPresets = useConfirmPresets();
  return (
    <section
      id={embedded ? undefined : "premium"}
      className={cn(
        "relative",
        embedded ? "overflow-visible" : "scroll-mt-24 overflow-hidden py-24",
      )}
    >
      {!embedded && <AmbientGlow />}
      <div
        className={cn(
          embedded ? "w-full min-w-0" : "layout-container relative",
        )}
      >
        {!embedded && (
          <SectionHeading
            eyebrow={t("premiumEyebrow")}
            title={
              <>
                {t("premiumTitleA")}{" "}
                <span className="text-gradient">{t("premiumTitleB")}</span>
              </>
            }
            description={t("premiumDesc")}
            align="center"
          />
        )}

        <div
          className={cn(
            "grid w-full min-w-0 grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3",
            !embedded && "mt-14",
          )}
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 34 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className={cn(
                "relative flex min-w-0 flex-col rounded-card p-6 sm:p-8",
                plan.badge && "pt-10 sm:pt-12",
                plan.highlight
                  ? "glass-strong border-2 border-[color-mix(in_srgb,var(--primary)_40%,transparent)] shadow-[0_0_48px_-16px_var(--glow-1)]"
                  : "glass",
              )}
            >
              {plan.badge && (
                <span
                  className={cn(
                    "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 font-display text-xs font-semibold uppercase tracking-wider whitespace-nowrap",
                    plan.highlight
                      ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-lg"
                      : "glass text-primary",
                  )}
                >
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center gap-2">
                {plan.highlight && <Crown className="h-5 w-5 shrink-0 text-primary" />}
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
                  {plan.name}
                </h3>
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-foreground sm:text-5xl">
                  {plan.price}
                </span>
                <span className="text-sm text-muted">{plan.period}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3 sm:mt-7">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 text-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              <ButtonLink
                href="/register"
                variant={plan.highlight ? "primary" : "outline"}
                size="md"
                className="mt-6 w-full sm:mt-8"
                confirm={
                  plan.name === "Free"
                    ? undefined
                    : confirmPresets.subscribePremium(plan.name)
                }
              >
                {plan.cta}
              </ButtonLink>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
