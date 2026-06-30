import { getEloRankTier } from "@/lib/ranked/elo-ranks";
import { cn } from "@/lib/utils";

type EloRankBadgeProps = {
  elo: number;
  rankName: string;
  groupName: string;
  showNumeric?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
};

/** Pure badge — pass translated labels from parent to avoid hydration mismatches. */
export function EloRankBadge({
  elo,
  rankName,
  groupName,
  showNumeric = false,
  size = "md",
  className,
}: EloRankBadgeProps) {
  const tier = getEloRankTier(elo);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-semibold leading-none",
        tier.bgClass,
        tier.colorClass,
        sizeStyles[size],
        className,
      )}
      title={showNumeric ? undefined : `${groupName} · ${rankName} (${elo})`}
    >
      <span className="truncate">{rankName}</span>
      {showNumeric && <span className="opacity-70">· {elo}</span>}
    </span>
  );
}
