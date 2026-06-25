"use client";

import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { StickerImage } from "@/components/inventory/sticker-image";
import { cn } from "@/lib/utils";

type StickerSlot = {
  slot: number;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

const MAX_DISPLAY_SLOTS = 4;

export function LoadoutStickerStrip({
  stickers,
  team,
  label,
  className,
  onClick,
}: {
  stickers: StickerSlot[];
  team: LoadoutTeam;
  label?: string;
  className?: string;
  onClick?: () => void;
}) {
  const sideLabel = label ?? (team === "T" ? "TR" : "CT");
  const bySlot = new Map(stickers.map((s) => [s.slot, s]));
  const slots = Array.from({ length: MAX_DISPLAY_SLOTS }, (_, i) => bySlot.get(i));

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-1 py-0.5",
        onClick && "hover:bg-white/5",
        className,
      )}
      title={sideLabel}
    >
      <span
        className={cn(
          "shrink-0 rounded px-1 text-[8px] font-bold uppercase",
          team === "T" ? "text-amber-400" : "text-sky-400",
        )}
      >
        {sideLabel}
      </span>
      <span className="flex flex-1 items-center justify-center gap-0.5">
        {slots.map((s, index) => {
          const filled = s && s.defIndex > 0;
          return (
            <span
              key={index}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border/25 bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
            >
              {filled ? (
                <StickerImage
                  src={s.imageUrl}
                  alt={s.name}
                  className="h-5 w-5 object-contain"
                  fallbackClassName="h-5 w-5"
                  fallbackLabel={String(index + 1)}
                />
              ) : (
                <span className="text-[7px] font-bold text-muted/35">{index + 1}</span>
              )}
            </span>
          );
        })}
      </span>
    </button>
  );
}
