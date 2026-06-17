import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND_ASSETS } from "@/lib/brand-assets";

const BANNER_SRC = BRAND_ASSETS.banner;
const BANNER_WIDTH = 1672;
const BANNER_HEIGHT = 941;

type ClutchClubeBannerProps = {
  priority?: boolean;
  className?: string;
};

/** Exibe o banner completo sem crop — a arte já traz texto e branding. */
export function ClutchClubeBanner({ priority = false, className }: ClutchClubeBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)] shadow-[0_20px_60px_-20px_var(--glow-1)]",
        className,
      )}
    >
      <Image
        src={BANNER_SRC}
        alt="Clutch Clube — comunidade competitiva de Counter-Strike"
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        priority={priority}
        sizes="(max-width: 1152px) 100vw, 1152px"
        className="block w-full h-auto"
      />
    </div>
  );
}
