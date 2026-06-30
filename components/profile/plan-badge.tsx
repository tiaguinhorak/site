"use client";

import { Crown, Shield, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Plan = "free" | "premium" | "elite";

const styles: Record<
  Plan,
  { className: string; icon: typeof Shield; glow?: string }
> = {
  free: {
    className:
      "border border-border/70 bg-muted/15 text-muted-foreground",
    icon: Shield,
  },
  premium: {
    className:
      "border border-primary/35 bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-primary",
    icon: Sparkles,
    glow: "shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_25%,transparent)]",
  },
  elite: {
    className:
      "border border-amber-400/45 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-yellow-500/15 text-amber-300",
    icon: Crown,
    glow: "shadow-[0_0_16px_rgba(251,191,36,0.25)]",
  },
};

export function PlanBadgeDisplay({
  plan,
  label,
  size = "md",
  className,
}: {
  plan: Plan;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const style = styles[plan];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-0.5 text-xs",
        size === "lg" && "px-3 py-1 text-sm",
        style.className,
        style.glow,
        className,
      )}
    >
      <Icon className={cn(size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} />
      {label}
    </span>
  );
}

export function PlanBadge({
  plan,
  size = "md",
  className,
}: {
  plan: Plan;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("profileCustomization");
  const label =
    plan === "elite" ? t("planElite") : plan === "premium" ? t("planPremium") : t("planFree");

  return <PlanBadgeDisplay plan={plan} label={label} size={size} className={className} />;
}
