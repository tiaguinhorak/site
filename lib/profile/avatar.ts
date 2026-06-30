import type { User, AvatarMediaType, AvatarModerationStatus } from "@/lib/generated/prisma/client";
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

type AvatarUserFields = Pick<User, "avatarUrl" | "avatarPreset" | "steamAvatarUrl"> & {
  avatarModerationStatus?: AvatarModerationStatus;
  avatarMediaType?: AvatarMediaType;
};

export function resolveUserAvatarUrl(
  user: AvatarUserFields,
  options?: { publicView?: boolean },
): string {
  const publicView = options?.publicView ?? false;
  const mediaType = user.avatarMediaType ?? "STATIC";
  const modStatus = user.avatarModerationStatus ?? "APPROVED";
  const customBlocked = publicView && mediaType === "GIF" && modStatus !== "APPROVED";

  if (user.avatarPreset && isValidAvatarPreset(user.avatarPreset)) {
    return avatarPresetUrl(user.avatarPreset);
  }
  if (user.avatarUrl && !customBlocked) return user.avatarUrl;
  if (user.steamAvatarUrl) return user.steamAvatarUrl;
  return getDefaultAvatarPresetUrl();
}

export function resolveAvatarIsAnimated(
  user: AvatarUserFields,
  options?: { publicView?: boolean },
): boolean {
  const mediaType = user.avatarMediaType ?? "STATIC";
  const modStatus = user.avatarModerationStatus ?? "APPROVED";
  if (mediaType !== "GIF" || !user.avatarUrl) return false;
  if (options?.publicView && modStatus !== "APPROVED") {
    return false;
  }
  return true;
}
