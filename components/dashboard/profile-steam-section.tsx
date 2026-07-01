"use client";

import {
  Unlink,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Globe,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SteamIcon } from "@/components/ui/icons";
import { secureApi } from "@/lib/api/client";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { getCountryLabel } from "@/lib/profile";
import { maskSteamId, formatSteamLinkedAt } from "@/lib/steam/display";
import type { UserProfile } from "@/lib/serializers";
import { cn } from "@/lib/utils";

type ProfileSteamSectionProps = {
  profile: Pick<
    UserProfile,
    | "steamLinked"
    | "steamId"
    | "steamPersonaName"
    | "steamAvatarUrl"
    | "steamProfileUrl"
    | "steamCountryCode"
    | "steamLinkedAt"
    | "anticheatInstalled"
  >;
  onSteamUnlink: (user: UserProfile) => void;
};

export function ProfileSteamSection({
  profile,
  onSteamUnlink,
}: ProfileSteamSectionProps) {
  const t = useTranslations("steamSection");
  const confirmPresets = useConfirmPresets();
  const {
    steamLinked,
    steamId,
    steamPersonaName,
    steamAvatarUrl,
    steamProfileUrl,
    steamCountryCode,
    steamLinkedAt,
    anticheatInstalled,
  } = profile;

  const linkedDate = formatSteamLinkedAt(steamLinkedAt);

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171a21] text-white ring-1 ring-border">
          <SteamIcon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">{t("title")}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="rounded-card glass overflow-hidden">
        <div className="border-b border-border glass-input px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#171a21] ring-1 ring-border">
                {steamLinked && steamAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={steamAvatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <SteamIcon className="h-7 w-7 text-white/90" />
                )}
              </div>
              <div>
                <p className="font-display text-base font-bold text-foreground">
                  {steamLinked ? (steamPersonaName ?? t("accountSteam")) : t("notLinked")}
                </p>
                <span
                  className={cn(
                    "mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                    steamLinked
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "badge-amber text-[10px] uppercase tracking-wide",
                  )}
                >
                  {steamLinked ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      {t("linked")}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      {t("pending")}
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {steamLinked && steamProfileUrl && (
                <a
                  href={steamProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
                >
                  <SteamIcon className="h-4 w-4" />
                  {t("steamProfile")}
                  <ExternalLink className="h-3 w-3 text-muted" />
                </a>
              )}
              {steamLinked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  confirm={confirmPresets.unlinkSteam}
                  onClick={async () => {
                    const result = await secureApi<{ ok: boolean; user: UserProfile }>(
                      "/api/profile/steam/unlink",
                      { method: "POST" },
                    );
                    if (result.ok) onSteamUnlink(result.data.user);
                  }}
                >
                  <Unlink className="h-4 w-4" />
                  {t("unlink")}
                </Button>
              ) : (
                <a
                  href="/api/auth/steam?mode=link"
                  className="inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold uppercase tracking-wide bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-[0_8px_30px_-8px_var(--glow-1)]"
                >
                  <SteamIcon className="h-4 w-4" />
                  {t("linkSteam")}
                </a>
              )}
            </div>
          </div>
        </div>

        {steamLinked ? (
          <dl className="grid gap-0 sm:grid-cols-2">
            {[
              {
                label: t("rowStatus"),
                value: t("statusValue"),
                icon: CheckCircle2,
                valueClass: "text-emerald-400",
              },
              {
                label: t("rowLinkedDate"),
                value: linkedDate ?? t("linkedDateFallback"),
                icon: Clock,
              },
              {
                label: t("rowSteamId"),
                value: steamId ? maskSteamId(steamId) : "—",
                icon: SteamIcon,
                mono: true,
                steamIcon: true,
              },
              {
                label: t("rowCountry"),
                value: steamCountryCode
                  ? getCountryLabel(steamCountryCode)
                  : t("countryFallback"),
                icon: Globe,
              },
              {
                label: t("rowPersona"),
                value: steamPersonaName ?? "—",
                icon: SteamIcon,
                steamIcon: true,
              },
              {
                label: t("rowAnticheat"),
                value: anticheatInstalled ? t("installed") : t("notDetected"),
                icon: ShieldCheck,
                valueClass: anticheatInstalled ? "text-emerald-400" : "text-muted",
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:px-6 sm:[&:nth-child(odd)]:border-r"
                >
                  {row.steamIcon ? (
                    <SteamIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  )}
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      {row.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-1 text-sm font-medium text-foreground",
                        row.mono && "font-mono text-xs tracking-wide",
                        row.valueClass,
                      )}
                    >
                      {row.value}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        ) : (
          <div className="px-5 py-8 text-center sm:px-6">
            <SteamIcon className="mx-auto h-10 w-10 text-muted opacity-60" />
            <p className="mt-4 text-sm text-muted">
              {t("notLinkedDesc")}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        {t("maskNote")}
      </p>
    </section>
  );
}
