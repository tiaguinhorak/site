"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Bell,
  Palette,
  MessageCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { ProfileAvatarPicker } from "@/components/dashboard/profile-avatar-picker";
import { ProfileCustomizationHero } from "@/components/profile/profile-customization-hero";
import { ProfileDisplayName } from "@/components/profile/profile-display-name";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { PlanBadge } from "@/components/profile/plan-badge";
import { ProfilePixSection } from "@/components/dashboard/profile-pix-section";
import { ProfileBasicForm } from "@/components/dashboard/profile-basic-form";
import { ProfileSecuritySection } from "@/components/dashboard/profile-security-section";
import { ProfileSteamSection } from "@/components/dashboard/profile-steam-section";
import { ProfileDiscordSection } from "@/components/dashboard/profile-discord-section";
import { ProfileCustomizationSection } from "@/components/dashboard/profile-customization-section";
import { NotificationSettingsSection } from "@/components/dashboard/notification-settings-section";
import { getCountryFlag } from "@/lib/profile";
import type { UserProfile } from "@/lib/serializers";
import { secureApi } from "@/lib/api/client";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { formatZodErrors } from "@/lib/security/schemas";
import { useValidationSchemas } from "@/lib/hooks/use-validation-schemas";
import { useUser } from "@/lib/hooks/use-user";
import {
  type AvatarDraft,
  avatarDraftIsDirty,
  unchangedAvatarDraft,
} from "@/lib/profile/avatar-draft";
import { compressImageFile } from "@/lib/client/compress-image";
import { API_REQUEST_HEADER } from "@/lib/brand";
import { toast } from "@/lib/toast";
import { ALLOWED_AVATAR_TYPES } from "@/lib/security/constants";
import { cn } from "@/lib/utils";
import { ProfilePageSkeleton } from "@/components/loading/page-skeletons";

type ProfileTab = "general" | "customization" | "security" | "steam" | "notifications" | "discord";

const PROFILE_TABS = new Set<ProfileTab>([
  "general",
  "customization",
  "security",
  "steam",
  "notifications",
  "discord",
]);

function parseProfileTab(value: string | null): ProfileTab {
  if (value && PROFILE_TABS.has(value as ProfileTab)) {
    return value as ProfileTab;
  }
  return "general";
}

function profileFieldsEqual(a: UserProfile, b: UserProfile): boolean {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.phone === b.phone &&
    a.country === b.country &&
    a.bio === b.bio &&
    a.nickname === b.nickname &&
    a.email === b.email
  );
}

export function ProfileSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("profile");
  const tForm = useTranslations("profileForm");
  const confirmPresets = useConfirmPresets();
  const validation = useValidationSchemas();
  const { user: profile, setUser, loading, refresh } = useUser();
  const tabs: { id: ProfileTab; label: string; icon: LucideIcon | typeof SteamIcon }[] = [
    { id: "general", label: t("tabGeneral"), icon: UserRound },
    { id: "customization", label: t("tabCustomization"), icon: Palette },
    { id: "security", label: t("tabSecurity"), icon: Shield },
    { id: "notifications", label: t("tabNotifications"), icon: Bell },
    { id: "steam", label: t("tabSteam"), icon: SteamIcon },
    { id: "discord", label: t("tabDiscord"), icon: MessageCircle },
  ];
  const [activeTab, setActiveTab] = useState<ProfileTab>(() =>
    parseProfileTab(searchParams.get("tab")),
  );
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft>(unchangedAvatarDraft);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDraft(profile);
      setAvatarDraft(unchangedAvatarDraft);
      setFieldErrors({});
      setAvatarError(null);
    }
  }, [profile?.id]);

  const hasUnsavedChanges = useMemo(() => {
    if (!profile || !draft) return false;
    return !profileFieldsEqual(profile, draft) || avatarDraftIsDirty(avatarDraft);
  }, [profile, draft, avatarDraft]);

  useEffect(() => {
    setActiveTab(parseProfileTab(searchParams.get("tab")));
  }, [searchParams]);

  function selectTab(tab: ProfileTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "general") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    const steamStatus = searchParams.get("steam");
    const steamError = searchParams.get("error");

    if (steamStatus === "linked") {
      refresh();
      selectTab("steam");
      toast.success(t("steamLinkedSuccess"));
    } else if (steamError === "steam_already_linked") {
      selectTab("steam");
      toast.error(t("steamAlreadyLinked"));
    }
  }, [searchParams, refresh, t]);

  async function applyAvatarDraft(current: UserProfile): Promise<UserProfile> {
    if (!avatarDraftIsDirty(avatarDraft)) return current;

    if (avatarDraft.kind === "upload") {
      if (!ALLOWED_AVATAR_TYPES.has(avatarDraft.file.type)) {
        throw new Error("invalidFormat");
      }
      const compressed = await compressImageFile(avatarDraft.file);
      const formData = new FormData();
      formData.append("file", compressed, "avatar.webp");
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: { [API_REQUEST_HEADER]: "1" },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "uploadFailed");
      }
      return data.user as UserProfile;
    }

    if (avatarDraft.kind === "remove") {
      const result = await secureApi<{ user: UserProfile }>("/api/profile/avatar", {
        method: "DELETE",
      });
      if (!result.ok) throw new Error(result.error);
      return result.data.user;
    }

    if (avatarDraft.kind === "preset") {
      const result = await secureApi<{ user: UserProfile }>("/api/profile/avatar", {
        method: "PATCH",
        json: { source: "preset", presetId: avatarDraft.presetId },
      });
      if (!result.ok) throw new Error(result.error);
      return result.data.user;
    }

    if (avatarDraft.kind === "steam") {
      const result = await secureApi<{ user: UserProfile }>("/api/profile/avatar", {
        method: "PATCH",
        json: { source: "steam" },
      });
      if (!result.ok) throw new Error(result.error);
      return result.data.user;
    }

    return current;
  }

  async function handleSaveGeneral() {
    if (!profile || !draft) return;
    setFieldErrors({});
    setAvatarError(null);

    const payload: Record<string, string> = {
      firstName: draft.firstName,
      lastName: draft.lastName,
      phone: draft.phone,
      country: draft.country,
      bio: draft.bio,
    };

    if (!draft.steamLinked) {
      payload.nickname = draft.nickname;
      payload.email = draft.email;
    }

    const schema = draft.steamLinked
      ? validation.profileUpdateSchema
      : validation.profileUpdateWithIdentitySchema;
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      setFieldErrors(formatZodErrors(parsed.error));
      toast.error(t("fixFields"));
      return;
    }

    setSaving(true);
    try {
      let nextUser = profile;
      if (avatarDraftIsDirty(avatarDraft)) {
        nextUser = await applyAvatarDraft(nextUser);
      }

      const result = await secureApi<{ ok: boolean; profile: UserProfile }>(
        "/api/profile",
        {
          method: "PATCH",
          json: parsed.data,
        },
      );

      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }

      setUser(result.data.profile);
      setDraft(result.data.profile);
      setAvatarDraft(unchangedAvatarDraft);
      toast.success(t("saved"));
    } catch (err) {
      const key =
        err instanceof Error && err.message === "invalidFormat"
          ? t("avatarInvalidFormat")
          : t("saveFailed");
      setAvatarError(key);
      toast.error(key);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile || !draft) {
    return <ProfilePageSkeleton />;
  }

  const showProfileHero = activeTab === "general";

  return (
    <div className="space-y-8">
      {showProfileHero ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ProfileCustomizationHero customization={profile.customization} ownerPreview>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <UserProfileAvatar
              avatarUrl={profile.avatarUrl}
              nickname={profile.nickname}
              customization={profile.customization}
              size="md"
              priority
            />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ProfileDisplayName
                  nickname={profile.nickname}
                  displayName={profile.displayName}
                  plan={profile.plan}
                  customization={profile.customization}
                  nameClassName="font-display text-2xl font-bold text-foreground sm:text-3xl"
                  badgeSize="sm"
                />
                {profile.mfaEnabled && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    {t("mfaActive")}
                  </span>
                )}
                {profile.steamLinked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] px-2.5 py-0.5 text-xs font-medium text-primary">
                    <SteamIcon className="h-3 w-3" />
                    {t("steamLinkedBadge")}
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
                {t("emailPrivate")} ·{" "}
                <a
                  href={`/player/${profile.nickname}`}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("viewPublic")}
                </a>
              </p>
              {profile.bio && (
                <p className="mt-2 text-sm text-muted line-clamp-2">
                  {profile.bio}
                </p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                <Trophy className="h-4 w-4 text-primary" />
                {t("globalRank", { rank: profile.rank, elo: profile.elo })}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {[
              { label: t("statKd"), value: profile.kd.toFixed(2), icon: Target },
              { label: t("statMatches"), value: profile.matches, icon: Trophy },
              { label: t("statWinRate"), value: `${profile.winRate}%`, icon: Trophy },
              { label: t("statHours"), value: profile.hoursPlayed, icon: Clock },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl glass p-4">
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
            <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl glass border border-amber-400/30 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                <p className="text-sm text-foreground">
                  {t("anticheatNotDetected")}
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
                {t("installNow")}
              </ButtonLink>
            </div>
          )}
        </ProfileCustomizationHero>
      </motion.div>
      ) : null}

      <div className="rounded-card glass-strong">
        <div className="border-b border-border px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto py-3" aria-label={t("settingsAria")}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
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
          {activeTab === "general" && (
            <div className="space-y-8">
              <ProfileAvatarPicker
                profile={draft}
                draft={avatarDraft}
                onDraftChange={setAvatarDraft}
                error={avatarError}
                disabled={saving}
              />
              <ProfileBasicForm
                profile={draft}
                fieldErrors={fieldErrors}
                saving={saving}
                onChange={(updates) => setDraft((prev) => (prev ? { ...prev, ...updates } : prev))}
                hideSave
              />
              <ProfilePixSection />
              {hasUnsavedChanges && (
                <p className="text-sm text-amber-800 dark:text-amber-400/90">{tForm("unsavedHint")}</p>
              )}
              <div className="flex justify-end border-t border-border pt-6">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={saving || !hasUnsavedChanges}
                  confirm={confirmPresets.editProfile}
                  onClick={handleSaveGeneral}
                >
                  {saving ? tForm("saving") : tForm("save")}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "customization" && <ProfileCustomizationSection />}

          {activeTab === "security" && (
            <ProfileSecuritySection
              mfaEnabled={profile.mfaEnabled}
              onMfaChange={(enabled) => setUser({ ...profile, mfaEnabled: enabled })}
            />
          )}

          {activeTab === "notifications" && <NotificationSettingsSection />}

          {activeTab === "steam" && (
            <ProfileSteamSection profile={profile} onSteamUnlink={setUser} />
          )}

          {activeTab === "discord" && (
            <ProfileDiscordSection
              profile={profile}
              onUpdate={setUser}
              initialCode={searchParams.get("discord_link")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
