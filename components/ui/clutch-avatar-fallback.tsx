import { cn } from "@/lib/utils";

type ClutchAvatarFallbackProps = {
  initials: string;
  className?: string;
  logoClassName?: string;
};

/** Branded placeholder when the user has no custom / Steam / preset avatar. */
export function ClutchAvatarFallback({
  initials,
  className,
  logoClassName,
}: ClutchAvatarFallbackProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-[#08050f] text-white",
        className,
      )}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,color-mix(in_srgb,var(--primary)_55%,transparent),transparent_68%)]"
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-clutchclube.png"
        alt=""
        className={cn(
          "absolute inset-0 m-auto h-[78%] w-[78%] object-contain opacity-35",
          logoClassName,
        )}
      />
      <span className="relative z-10 font-display font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
        {initials}
      </span>
    </div>
  );
}
