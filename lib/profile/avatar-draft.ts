import type { UserProfile } from "@/lib/serializers";
import { avatarPresets, avatarPresetUrl } from "@/lib/profile/avatar-presets";
import { getAvatarInitials } from "@/lib/profile";

export type AvatarDraft =
  | { kind: "unchanged" }
  | { kind: "preset"; presetId: string }
  | { kind: "steam" }
  | { kind: "upload"; file: File; previewUrl: string }
  | { kind: "remove" };

export const unchangedAvatarDraft: AvatarDraft = { kind: "unchanged" };

export function avatarDraftIsDirty(draft: AvatarDraft): boolean {
  return draft.kind !== "unchanged";
}

export function getAvatarPreview(
  profile: UserProfile,
  draft: AvatarDraft,
): {
  url: string | null;
  presetGradient: string | null;
  initials: string;
} {
  const initials = getAvatarInitials(
    profile.firstName,
    profile.lastName,
    profile.nickname,
  );

  switch (draft.kind) {
    case "upload":
      return { url: draft.previewUrl, presetGradient: null, initials };
    case "steam":
      return {
        url: profile.steamAvatarUrl ?? profile.avatarUrl,
        presetGradient: null,
        initials,
      };
    case "preset":
      return {
        url: avatarPresetUrl(draft.presetId),
        presetGradient: null,
        initials,
      };
    case "remove":
      return { url: null, presetGradient: null, initials };
    case "unchanged":
    default:
      if (profile.avatarPreset) {
        const preset = avatarPresets.find((p) => p.id === profile.avatarPreset);
        if (preset && !profile.customAvatarUrl && profile.avatarSource !== "steam") {
          return {
            url: avatarPresetUrl(profile.avatarPreset),
            presetGradient: preset.gradient,
            initials,
          };
        }
      }
      return { url: profile.avatarUrl, presetGradient: null, initials };
  }
}
