import type { AvatarMediaType, AvatarModerationStatus } from "@/lib/generated/prisma/client";

export type BannerUserFields = {
  profileBannerUrl: string | null;
  profileBannerMediaType?: AvatarMediaType;
  profileBannerModerationStatus?: AvatarModerationStatus;
};

export function resolveProfileBannerUrl(
  user: BannerUserFields,
  options?: { publicView?: boolean },
): string | null {
  const url = user.profileBannerUrl;
  if (!url) return null;

  const mediaType = user.profileBannerMediaType ?? "STATIC";
  const modStatus = user.profileBannerModerationStatus ?? "APPROVED";
  const publicView = options?.publicView ?? false;

  if (publicView && mediaType === "GIF" && modStatus !== "APPROVED") {
    return null;
  }

  return url;
}

export function isProfileBannerAnimated(
  user: BannerUserFields,
  options?: { publicView?: boolean },
): boolean {
  const mediaType = user.profileBannerMediaType ?? "STATIC";
  const modStatus = user.profileBannerModerationStatus ?? "APPROVED";
  if (mediaType !== "GIF" || !user.profileBannerUrl) return false;
  if (options?.publicView && modStatus !== "APPROVED") return false;
  return true;
}
