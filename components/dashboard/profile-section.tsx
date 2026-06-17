"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Trophy,
  Target,
  Clock,
  ShieldAlert,
  ExternalLink,
  UserRound,
  Shield,
} from "lucide-react";
import { SteamIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { ProfileAvatarPicker } from "@/components/dashboard/profile-avatar-picker";
import { ProfileBasicForm } from "@/components/dashboard/profile-basic-form";
import { ProfileSecuritySection } from "@/components/dashboard/profile-security-section";
import { ProfileSteamSection } from "@/components/dashboard/profile-steam-section";
import { getCountryFlag } from "@/lib/profile";
import type { UserProfile } from "@/lib/serializers";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import {
  profileUpdateSchema,
  formatZodErrors,
} from "@/lib/security/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";

const planBadge = {
  free: "bg-muted/20 text-muted",
  premium: "bg-primary/20 text-primary",
  elite: "bg-amber-500/20 text-amber-400",
};

type ProfileTab = "general" | "security" | "steam";

const tabs: { id: ProfileTab; label: string; icon: LucideIcon | typeof SteamIcon }[] = [
  { id: "general", label: "Informações", icon: UserRound },
  { id: "security", label: "Segurança", icon: Shield },
  { id: "steam", label: "Steam", icon: SteamIcon },
];

export function ProfileSection() {
  const searchParams = useSearchParams();
  const { user: profile, patchUser, setUser, loading, refresh } = useUser();
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function updateProfile(updates: Partial<UserProfile>) {
    patchUser(updates);
  }

  useEffect(() => {
    const steamStatus = searchParams.get("steam");
    const steamError = searchParams.get("error");

    if (steamStatus === "linked") {
      refresh();
      setActiveTab("steam");
      setSavedMessage("Steam vinculada com sucesso. Foto e nome importados.");
      setTimeout(() => setSavedMessage(null), 5000);
    } else if (steamError === "steam_already_linked") {
      setActiveTab("steam");
      setSavedMessage("Esta conta Steam já está vinculada a outro usuário.");
    }
  }, [searchParams, refresh]);

  async function handleSaveBasic() {
    if (!profile) return;
    setFieldErrors({});
    setSavedMessage(null);

    const payload: Record<string, string> = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      country: profile.country,
      bio: profile.bio,
    };

    if (!profile.steamLinked) {
      payload.nickname = profile.nickname;
      payload.email = profile.email;
    }

    const parsed = profileUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      setFieldErrors(formatZodErrors(parsed.error));
      setSavedMessage("Corrija os campos destacados.");
      return;
    }

    setSaving(true);
    const result = await secureApi<{ ok: boolean; profile: UserProfile }>("/api/profile", {
      method: "PATCH",
      json: parsed.data,
    });
    setSaving(false);

    if (!result.ok) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setSavedMessage(result.error);
      return;
    }

    setUser(result.data.profile);
    setSavedMessage("Alterações salvas com sucesso.");
    setTimeout(() => setSavedMessage(null), 3000);
  }

  if (loading || !profile) {
    return (
      <div className="rounded-card glass p-8 text-center text-muted">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-card glass-strong"
      >
        <div className="relative p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
            style={{ background: "var(--glow-1)" }}
            aria-hidden
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] font-display text-3xl font-bold text-white shadow-lg">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                profile.avatarInitials
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {profile.nickname}
                </h2>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                    planBadge[profile.plan],
                  )}
                >
                  {profile.plan}
                </span>
                {profile.mfaEnabled && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    2FA ativo
                  </span>
                )}
                {profile.steamLinked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] px-2.5 py-0.5 text-xs font-medium text-primary">
                    <SteamIcon className="h-3 w-3" />
                    Steam vinculado
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">
                <span className="mr-1">{getCountryFlag(profile.country)}</span>
                {profile.firstName} {profile.lastName}
                {profile.steamLinked && profile.steamPersonaName && (
                  <span className="inline-flex items-center gap-1">
                    <SteamIcon className="h-3.5 w-3.5 text-primary" />
                    {profile.steamPersonaName}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">
                E-mail privado ·{" "}
                <a
                  href={`/player/${profile.nickname}`}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver perfil público
                </a>
              </p>
              {profile.bio && (
                <p className="mt-2 text-sm text-muted line-clamp-2">
                  {profile.bio}
                </p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                <Trophy className="h-4 w-4 text-primary" />
                Rank global #{profile.rank} · {profile.elo} ELO
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {[
              { label: "K/D", value: profile.kd.toFixed(2), icon: Target },
              { label: "Partidas", value: profile.matches, icon: Trophy },
              { label: "Win rate", value: `${profile.winRate}%`, icon: Trophy },
              { label: "Horas", value: profile.hoursPlayed, icon: Clock },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {stat.label}
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>

          {!profile.anticheatInstalled && (
            <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
                <p className="text-sm text-foreground">
                  Anticheat não detectado. Instale para jogar no modo competitivo.
                </p>
              </div>
              <ButtonLink
                href="/dashboard/anticheat"
                variant="outline"
                size="sm"
                className="shrink-0"
                confirm={confirmPresets.downloadAnticheat}
              >
                <ExternalLink className="h-4 w-4" />
                Instalar agora
              </ButtonLink>
            </div>
          )}
        </div>
      </motion.div>

      {/* Settings */}
      <div className="overflow-hidden rounded-card glass-strong">
        <div className="border-b border-border px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto py-3" aria-label="Configurações do perfil">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground"
                      : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 sm:p-8">
          {savedMessage && (
            <div
              className={cn(
                "mb-6 rounded-xl border px-4 py-3 text-sm",
                savedMessage.includes("sucesso")
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-400",
              )}
              role="status"
            >
              {savedMessage}
            </div>
          )}

          {activeTab === "general" && (
            <div className="space-y-8">
              <ProfileAvatarPicker
                profile={profile}
                onUpdated={setUser}
              />
              <ProfileBasicForm
                profile={profile}
                fieldErrors={fieldErrors}
                saving={saving}
                onChange={updateProfile}
                onSave={handleSaveBasic}
              />
            </div>
          )}

          {activeTab === "security" && (
            <ProfileSecuritySection
              mfaEnabled={profile.mfaEnabled}
              onMfaChange={(enabled) => updateProfile({ mfaEnabled: enabled })}
            />
          )}

          {activeTab === "steam" && (
            <ProfileSteamSection
              profile={profile}
              onSteamUnlink={setUser}
            />
          )}
        </div>
      </div>
    </div>
  );
}
