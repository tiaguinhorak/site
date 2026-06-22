import { cn } from "@/lib/utils";
import { accentForRarity } from "@/lib/inventory/rarity-tiers";

type SkinRarityLineProps = {
  rarity?: string;
  accent?: string;
  className?: string;
  position?: "top" | "bottom";
};

export function SkinRarityLine({
  rarity,
  accent,
  className,
  position = "top",
}: SkinRarityLineProps) {
  const gradient = accent ?? (rarity ? accentForRarity(rarity) : "from-slate-500 to-zinc-700");

  return (
    <span
      className={cn(
        "block h-1 w-full shrink-0 bg-linear-to-r",
        position === "top" ? "rounded-t-xl" : "rounded-b-xl",
        gradient,
        className,
      )}
      aria-hidden
    />
  );
}
