"use client";

import { motion } from "motion/react";
import {
  ShieldCheck,
  Download,
  Cpu,
  Eye,
  Lock,
  Gauge,
  CheckCircle2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { SteamRequiredCard } from "@/components/dashboard/steam-required-card";
import { SteamIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/reveal";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { useAuthSession } from "@/lib/hooks/use-auth-session";

const protectionIcons = [Eye, Cpu, Lock, Gauge];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function DownloadActions() {
  const t = useTranslations("anticheatPage");
  const confirmPresets = useConfirmPresets();
  const { authenticated, steamLinked, loading } = useAuthSession();

  if (loading) {
    return (
      <div className="mt-9 text-sm text-muted">{t("checkingAccount")}</div>
    );
  }

  if (authenticated && !steamLinked) {
    return (
      <div className="mt-9">
        <SteamRequiredCard
          title={t("steamRequiredTitle")}
          description={t("steamRequiredDesc")}
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={item}
      className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
    >
      {authenticated && steamLinked ? (
        <Button
          size="lg"
          className="w-full sm:w-auto"
          confirm={confirmPresets.downloadAnticheat}
          onClick={() => {}}
        >
          <Download className="h-5 w-5" />
          {t("downloadWindows")}
        </Button>
      ) : (
        <ButtonLink
          href="/api/auth/steam?mode=login"
          variant="primary"
          size="lg"
          className="w-full sm:w-auto"
        >
          <SteamIcon className="h-5 w-5" />
          {t("loginWithSteam")}
        </ButtonLink>
      )}
      {!authenticated && (
        <ButtonLink href="/register" variant="glass" size="lg" className="w-full sm:w-auto">
          {t("createAccount")}
        </ButtonLink>
      )}
    </motion.div>
  );
}

export function AnticheatPage() {
  const t = useTranslations("anticheatPage");
  const confirmPresets = useConfirmPresets();
  const { authenticated, steamLinked } = useAuthSession();

  const protections = protectionIcons.map((icon, i) => ({
    icon,
    title: t(`protect${i + 1}Title`),
    text: t(`protect${i + 1}Text`),
  }));
  const steps = [t("step1"), t("step2"), t("step3"), t("step4")];
  const requirements = [
    { label: t("reqSystemLabel"), value: t("reqSystemValue") },
    { label: t("reqMemoryLabel"), value: t("reqMemoryValue") },
    { label: t("reqSpaceLabel"), value: t("reqSpaceValue") },
    { label: t("reqPermsLabel"), value: t("reqPermsValue") },
    { label: t("reqAccountLabel"), value: t("reqAccountValue") },
  ];

  return (
    <section className="relative overflow-hidden pb-24 pt-32 sm:pt-40">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-96 w-[44rem] -translate-x-1/2 rounded-full opacity-50 blur-[130px]"
          style={{ background: "var(--glow-1)" }}
        />
      </div>

      <div className="layout-container relative">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={item} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t("badge")}
            </span>
          </motion.div>
          <motion.h1
            variants={item}
            className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl"
          >
            {t("titleA")}{" "}
            <span className="text-gradient">{t("titleB")}</span>
          </motion.h1>
          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg"
          >
            {t("subtitle")}
          </motion.p>
          <DownloadActions />
          <motion.p variants={item} className="mt-4 text-xs text-muted">
            {t("versionNote")}
          </motion.p>
        </motion.div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {protections.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-card glass p-6 transition-shadow hover:glow-ring"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-20 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="rounded-card glass-strong p-8"
          >
            <SectionHeading
              eyebrow={t("installEyebrow")}
              title={t("installTitle")}
            />
            <ol className="mt-8 space-y-5">
              {steps.map((step, i) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] font-display text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="pt-1.5 text-sm text-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col rounded-card glass p-8"
          >
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
              {t("requirementsTitle")}
            </h3>
            <ul className="mt-6 space-y-4">
              {requirements.map((req) => (
                <li
                  key={req.label}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-muted">{req.label}</span>
                  <span className="font-display text-sm font-semibold text-foreground">
                    {req.value}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("vacNote")}
            </div>
            {authenticated && steamLinked ? (
              <Button
                size="lg"
                className="mt-6 w-full"
                confirm={confirmPresets.downloadAnticheat}
                onClick={() => {}}
              >
                <Download className="h-5 w-5" />
                {t("downloadNow")}
              </Button>
            ) : (
              <ButtonLink
                href={authenticated ? "/api/auth/steam?mode=link" : "/api/auth/steam?mode=login"}
                variant="primary"
                size="lg"
                className="mt-6 w-full"
              >
                <SteamIcon className="h-5 w-5" />
                {authenticated ? t("linkSteamLabel") : t("loginWithSteam")}
              </ButtonLink>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
