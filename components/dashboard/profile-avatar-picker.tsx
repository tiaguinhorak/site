"use client";

import { useRef } from "react";
import { Camera, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SteamIcon } from "@/components/ui/icons";
import {
  DEFAULT_AVATAR_PRESET,
  avatarPresets,
  avatarPresetUrl,
} from "@/lib/profile/avatar-presets";
import {
  type AvatarDraft,
  getAvatarPreview,
  unchangedAvatarDraft,
} from "@/lib/profile/avatar-draft";
import type { UserProfile } from "@/lib/serializers";
import { SITE_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type ProfileAvatarPickerProps = {
  profile: UserProfile;
  draft: AvatarDraft;
  onDraftChange: (draft: AvatarDraft) => void;
  error?: string | null;
  disabled?: boolean;
};

export function ProfileAvatarPicker({
  profile,
  draft,
  onDraftChange,
  error,
  disabled = false,
}: ProfileAvatarPickerProps) {
  const t = useTranslations("avatar");
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = getAvatarPreview(profile, draft);
  const activePresetId =
    draft.kind === "preset"
      ? draft.presetId
      : draft.kind === "remove"
        ? DEFAULT_AVATAR_PRESET
        : draft.kind === "unchanged"
          ? profile.avatarPreset ??
            (profile.avatarSource === "preset" ? DEFAULT_AVATAR_PRESET : null)
          : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    onDraftChange({ kind: "upload", file, previewUrl });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled}
            className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60"
            aria-label={t("changePhotoAria")}
          >
            {preview.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={t("photoAlt")}
                className="h-full w-full object-cover"
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center bg-[rgb(0_0_0/0.45)] opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </div>

        <div className="text-center sm:text-left">
          <p className="font-display text-sm font-semibold text-foreground">
            {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("desc", { site: SITE_NAME })}
          </p>
          <p className="mt-1 text-xs text-muted">{t("saveHint")}</p>
          {(draft.kind === "steam" ||
            (draft.kind === "unchanged" &&
              profile.avatarSource === "steam" &&
              profile.steamLinked)) && (
            <p className="mt-1 text-xs text-primary">{t("usingSteam")}</p>
          )}
          {error && (
            <p className="mt-2 text-xs text-rose-400" role="alert">{error}</p>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {t("upload")}
            </Button>
            {profile.steamLinked && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onDraftChange({ kind: "steam" })}
              >
                <SteamIcon className="h-4 w-4" />
                {t("useSteam")}
              </Button>
            )}
            {(profile.customAvatarUrl ||
              profile.avatarPreset ||
              draft.kind !== "unchanged") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onDraftChange({ kind: "remove" })}
              >
                {t("remove")}
              </Button>
            )}
            {draft.kind !== "unchanged" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onDraftChange(unchangedAvatarDraft)}
              >
                {t("undo")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted">
          {t("presetsTitle", { site: SITE_NAME })}
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {avatarPresets.map((preset) => {
            const active = activePresetId === preset.id;
            const presetLabel = t(`presetLabels.${preset.id}` as "presetLabels.viper");
            return (
              <button
                key={preset.id}
                type="button"
                title={presetLabel}
                disabled={disabled}
                onClick={() => onDraftChange({ kind: "preset", presetId: preset.id })}
                className={cn(
                  "relative h-12 w-12 overflow-hidden rounded-xl border-2 transition-all hover:scale-105",
                  active
                    ? "border-primary ring-2 ring-[color-mix(in_srgb,var(--primary)_40%,transparent)]"
                    : "border-transparent",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPresetUrl(preset.id)}
                  alt={presetLabel}
                  className="h-full w-full object-cover"
                />
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-[rgb(0_0_0/0.3)]">
                    <Check className="h-4 w-4 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
