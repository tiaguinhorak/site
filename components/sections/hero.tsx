"use client";

import { motion } from "motion/react";
import { ShieldCheck, Gamepad2, Wifi, Users, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { SteamIcon } from "@/components/ui/icons";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { skinNames } from "@/lib/profile";

export type StatView = { value: string; label: string };

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

export function Hero({ stats }: { stats: StatView[] }) {
  const { authenticated, steamLinked } = useAuthSession();
  const t = useTranslations("hero");
  const confirmPresets = useConfirmPresets();

  return (
    <section className="relative isolate overflow-hidden pb-20 pt-36 sm:pt-44">
      {/* Background layers */}
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-[-10rem] h-[40rem] w-[55rem] -translate-x-1/2 rounded-full opacity-60 blur-[140px] animate-pulse-glow"
          style={{ background: "var(--glow-1)" }}
        />
        <div
          className="absolute right-[-10rem] top-40 h-[28rem] w-[28rem] rounded-full opacity-50 blur-[130px]"
          style={{ background: "var(--glow-2)" }}
        />
      </div>

      <div className="layout-container relative">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={item} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] glass px-4 py-1.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {t("badge")}
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-7 font-display text-5xl font-bold leading-[0.95] tracking-tight text-foreground sm:text-7xl md:text-8xl"
          >
            {t("titleLine1")}
            <span className="block text-gradient animate-shine bg-[length:200%_auto]">
              {t("titleLine2")}
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            {authenticated ? (
              steamLinked ? (
                <ButtonLink
                  href="/dashboard"
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  {t("goDashboard")}
                </ButtonLink>
              ) : (
                <ButtonLink
                  href="/api/auth/steam?mode=link"
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <SteamIcon className="h-5 w-5" />
                  {t("linkSteam")}
                </ButtonLink>
              )
            ) : (
              <ButtonLink
                href="/login"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <SteamIcon className="h-5 w-5" />
                {t("signInSteam")}
              </ButtonLink>
            )}
            <ButtonLink
              href="/anticheat"
              variant="glass"
              size="lg"
              className="w-full sm:w-auto"
              confirm={confirmPresets.downloadAnticheat}
            >
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t("downloadAnticheat")}
            </ButtonLink>
          </motion.div>

          {/* Quick connect glass bar */}
          <motion.div
            variants={item}
            className="glass-strong glow-ring mx-auto mt-12 flex max-w-2xl flex-col items-center gap-4 rounded-2xl p-2 sm:flex-row"
          >
            <div className="flex w-full items-center gap-3 px-3 py-2 sm:flex-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-primary">
                <Gamepad2 className="h-5 w-5" />
              </span>
              <div className="text-left">
                <p className="font-display text-sm font-semibold text-foreground">
                  {t("quickConnect")}
                </p>
                <p className="text-xs text-muted">
                  {t("quickConnectDesc")}
                </p>
              </div>
            </div>
            <ButtonLink
              href={
                authenticated
                  ? steamLinked
                    ? "/dashboard"
                    : "/api/auth/steam?mode=link"
                  : "/register"
              }
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              confirm={
                authenticated
                  ? undefined
                  : confirmPresets.quickConnect
              }
            >
              {authenticated ? (
                steamLinked ? (
                  <>
                    <LayoutDashboard className="h-4 w-4" />
                    {t("goDashboard")}
                  </>
                ) : (
                  <>
                    <SteamIcon className="h-4 w-4" />
                    {t("linkSteam")}
                  </>
                )
              ) : (
                t("connectNow")
              )}
            </ButtonLink>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.ul
          variants={container}
          initial="hidden"
          animate="visible"
          className="mt-16 grid w-full min-w-0 grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6"
        >
          {stats.map((s, i) => (
            <motion.li
              key={s.label}
              variants={item}
              className="glass rounded-2xl px-5 py-6 text-center"
            >
              <div className="font-display text-3xl font-bold text-gradient sm:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                {i === 0 && <Gamepad2 className="h-3.5 w-3.5" />}
                {i === 1 && <Wifi className="h-3.5 w-3.5" />}
                {i === 2 && <Users className="h-3.5 w-3.5" />}
                {i === 3 && <ShieldCheck className="h-3.5 w-3.5" />}
                {s.label}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Skins marquee */}
      <div className="relative mt-16 flex overflow-hidden border-y border-border py-4 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex shrink-0 animate-marquee items-center gap-8 pr-8">
          {[...skinNames, ...skinNames].map((skin, i) => (
            <span
              key={`${skin}-${i}`}
              className="font-display text-sm font-medium uppercase tracking-[0.2em] text-muted"
            >
              {skin}
              <span className="ml-8 text-primary">◆</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
