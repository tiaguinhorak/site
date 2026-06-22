"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, Download } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SteamRequiredCard } from "@/components/dashboard/steam-required-card";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { useUser } from "@/lib/hooks/use-user";

export function AnticheatSection() {
  const { user, loading } = useUser();
  const t = useTranslations("anticheat");
  const confirmPresets = useConfirmPresets();

  if (loading) {
    return (
      <div className="rounded-card glass p-8 text-center text-muted">
        {t("loading")}
      </div>
    );
  }

  if (!user) return null;

  if (!user.steamLinked) {
    return (
      <SteamRequiredCard
        title={t("steamTitle")}
        description={t("steamDesc")}
      />
    );
  }

  const installed = user.anticheatInstalled;

  return (
    <section className="overflow-hidden rounded-card glass-strong p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl font-bold text-foreground">
            {installed ? t("installedTitle") : t("requiredTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {installed ? t("installedDesc") : t("requiredDesc")}
          </p>
        </div>
        {!installed && (
          <ButtonLink
            href="/anticheat"
            variant="primary"
            size="md"
            className="shrink-0"
            confirm={confirmPresets.downloadAnticheat}
          >
            <Download className="h-4 w-4" />
            {t("download")}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
