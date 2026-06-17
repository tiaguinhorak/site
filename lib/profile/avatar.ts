import type { User } from "@/lib/generated/prisma/client";
import { avatarPresetUrl, avatarPresetIds } from "@/lib/profile/avatar-presets";

export function isValidAvatarPreset(id: string): boolean {
  return avatarPresetIds.includes(id);
}

export function resolveUserAvatarUrl(user: Pick<
  User,
  "avatarUrl" | "avatarPreset" | "steamAvatarUrl"
>): string | null {
  if (user.avatarPreset && isValidAvatarPreset(user.avatarPreset)) {
    return avatarPresetUrl(user.avatarPreset);
  }
  if (user.avatarUrl) return user.avatarUrl;
  if (user.steamAvatarUrl) return user.steamAvatarUrl;
  return null;
}
