import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";

export const PROFILE_CUSTOMIZATION_CHANGED_EVENT = "clutch:profile-customization-changed";

export type ProfileCustomizationChangedDetail = {
  customization: PublicProfileCustomization | null;
};

export function notifyProfileCustomizationChanged(
  customization: PublicProfileCustomization | null,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ProfileCustomizationChangedDetail>(
      PROFILE_CUSTOMIZATION_CHANGED_EVENT,
      { detail: { customization } },
    ),
  );
}
