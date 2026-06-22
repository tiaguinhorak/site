"use client";

import {
  Image,
  UserRound,
  Globe,
  ShieldCheck,
  Lock,
  Ban,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/ui/icons";

export function SteamDataNotice({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("steamDataNotice");
  const collected = [
    { icon: Image, label: t("photo") },
    { icon: UserRound, label: t("persona") },
    { icon: SteamIcon, steamIcon: true, label: t("steamId") },
    { icon: Globe, label: t("country") },
    { icon: SteamIcon, steamIcon: true, label: t("profileLink") },
  ];

  const notCollected = [
    { icon: Lock, label: t("password") },
    { icon: Ban, label: t("accountAccess") },
    { icon: ShieldCheck, label: t("paymentData") },
  ];

  return (
    <div
      className={`rounded-xl border border-[color-mix(in_srgb,var(--primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] ${compact ? "p-4" : "p-5"}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#171a21] text-white">
          <SteamIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-foreground">
            {t("title")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t("description")}
          </p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {collected.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className="flex items-center gap-2 rounded-lg glass-chip px-3 py-2 text-xs text-foreground"
            >
              {item.steamIcon ? (
                <SteamIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              {item.label}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
        {t("notCollectedTitle")}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {notCollected.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs text-muted"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
