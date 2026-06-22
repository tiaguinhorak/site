import type { User } from "@/lib/generated/prisma/client";
import {
  avatarPresetUrl,
  avatarPresetIds,
  DEFAULT_AVATAR_PRESET,
} from "@/lib/profile/avatar-presets";

export { DEFAULT_AVATAR_PRESET } from "@/lib/profile/avatar-presets";
export function isValidAvatarPreset(id: string): boolean {
  return avatarPresetIds.includes(id);
}

export function getDefaultAvatarPresetUrl(): string {
  return avatarPresetUrl(DEFAULT_AVATAR_PRESET);
}

export function resolveUserAvatarUrl(
  user: Pick<User, "avatarUrl" | "avatarPreset" | "steamAvatarUrl">,
): string {
  if (user.avatarPreset && isValidAvatarPreset(user.avatarPreset)) {
    return avatarPresetUrl(user.avatarPreset);
  }
  if (user.avatarUrl) return user.avatarUrl;
  if (user.steamAvatarUrl) return user.steamAvatarUrl;
  return getDefaultAvatarPresetUrl();
}
