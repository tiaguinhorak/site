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
import { Button } from "@/components/ui/button";
import { SteamIcon } from "@/components/ui/icons";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
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
          <h3 className="font-display text-lg font-bold text-foreground">Steam</h3>
          <p className="mt-0.5 text-sm text-muted">
            Status da vinculação e dados públicos importados da sua conta Steam.
          </p>
        </div>
      </div>

      <div className="rounded-card border border-border overflow-hidden">
        <div className="border-b border-border bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] px-5 py-4 sm:px-6">
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
                  {steamLinked ? (steamPersonaName ?? "Conta Steam") : "Steam não vinculada"}
                </p>
                <span
                  className={cn(
                    "mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                    steamLinked
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400",
                  )}
                >
                  {steamLinked ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Vinculada
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Pendente
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
                  Perfil Steam
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
                  Desvincular
                </Button>
              ) : (
                <a
                  href="/api/auth/steam?mode=link"
                  className="inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold uppercase tracking-wide bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-[0_8px_30px_-8px_var(--glow-1)]"
                >
                  <SteamIcon className="h-4 w-4" />
                  Vincular Steam
                </a>
              )}
            </div>
          </div>
        </div>

        {steamLinked ? (
          <dl className="grid gap-0 sm:grid-cols-2">
            {[
              {
                label: "Status",
                value: "Conta vinculada e ativa",
                icon: CheckCircle2,
                valueClass: "text-emerald-400",
              },
              {
                label: "Data da vinculação",
                value: linkedDate ?? "Registro anterior à atualização",
                icon: Clock,
              },
              {
                label: "Steam ID",
                value: steamId ? maskSteamId(steamId) : "—",
                icon: SteamIcon,
                mono: true,
                steamIcon: true,
              },
              {
                label: "País Steam",
                value: steamCountryCode
                  ? getCountryLabel(steamCountryCode)
                  : "Não informado",
                icon: Globe,
              },
              {
                label: "Persona",
                value: steamPersonaName ?? "—",
                icon: SteamIcon,
                steamIcon: true,
              },
              {
                label: "Anticheat",
                value: anticheatInstalled ? "Instalado" : "Não detectado",
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
              Vincule sua Steam para jogar nos servidores, usar o anticheat e
              sincronizar foto e nickname automaticamente.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        O Steam ID é exibido parcialmente mascarado por segurança. Ao vincular,
        importamos apenas dados públicos da Steam (foto, nome e país).
      </p>
    </section>
  );
}
