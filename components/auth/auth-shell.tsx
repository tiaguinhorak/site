"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, ShieldCheck, Trophy, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  compact = false,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  compact?: boolean;
}) {
  const t = useTranslations("auth");
  const perks = [
    { icon: Zap, text: t("perk1") },
    { icon: Trophy, text: t("perk2") },
    { icon: ShieldCheck, text: t("perk3") },
  ];
  return (
    <section
      className={cn(
        "relative min-h-dvh overflow-x-hidden px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 lg:px-10",
        compact && "pb-8",
      )}
    >
      <div
        className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-20 top-10 h-72 w-72 rounded-full opacity-50 blur-[130px] sm:h-96 sm:w-96"
          style={{ background: "var(--glow-1)" }}
        />
        <div
          className="absolute -right-20 bottom-0 h-72 w-72 rounded-full opacity-40 blur-[130px] sm:h-96 sm:w-96"
          style={{ background: "var(--glow-2)" }}
        />
      </div>

      <div
        className={cn(
          "relative mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8",
          compact && "max-w-lg lg:max-w-2xl lg:grid-cols-1",
        )}
      >
        {/* Brand / marketing panel */}
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className={cn(
            "relative hidden flex-col justify-between overflow-hidden rounded-card glass-strong p-8 lg:flex lg:p-10",
            compact && "lg:hidden",
          )}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl"
            style={{ background: "var(--glow-1)" }}
            aria-hidden
          />
          <div className="relative">
            <Logo />
            <h2 className="mt-8 font-display text-3xl font-bold leading-tight text-foreground xl:text-4xl">
              {t("trainTitle")}{" "}
              <span className="text-gradient">{t("trainHighlight")}</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {t("trainSubtitle")}
            </p>

            <ul className="mt-8 space-y-4">
              {perks.map((perk) => {
                const Icon = perk.icon;
                return (
                  <li key={perk.text} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="text-sm text-foreground">{perk.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative mt-8 flex items-center gap-3 rounded-xl glass p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">
              <Check className="h-4 w-4" />
            </span>
            <p className="text-xs text-muted">
              <span className="font-semibold text-foreground">{t("playersBadge")}</span>{" "}
              {t("playersOnline")}
            </p>
          </div>
        </motion.aside>

        {/* Form panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-card glass-strong p-5 sm:p-8 lg:p-10"
        >
          <div className="mb-6 sm:mb-7">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          </div>

          {children}

          <p className="mt-6 text-center text-sm text-muted">{footer}</p>

          {!compact && (
            <p className="mt-4 text-center text-xs text-muted/80 sm:mt-6">
              {t("termsPrefix")}{" "}
              <Link href="#" className="text-primary hover:underline">
                {t("terms")}
              </Link>{" "}
              {t("and")}{" "}
              <Link href="#" className="text-primary hover:underline">
                {t("privacy")}
              </Link>
              .
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
