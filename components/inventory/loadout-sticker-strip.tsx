"use client";

import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { cn } from "@/lib/utils";

type StickerSlot = {
  slot: number;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

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
  const filled = stickers.filter((s) => s.defIndex > 0);
  const sideLabel = label ?? (team === "T" ? "TR" : "CT");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-1 rounded-md px-1 py-0.5",
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
      <span className="flex flex-1 items-center justify-center gap-0.5 min-h-6">
        {filled.length === 0 ? (
          <span className="text-[9px] text-muted/50">—</span>
        ) : (
          filled.map((s) =>
            s.imageUrl ? (
              <img
                key={s.slot}
                src={s.imageUrl}
                alt={s.name}
                className="h-5 w-5 object-contain"
              />
            ) : (
              <span
                key={s.slot}
                className="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[8px] text-muted"
              >
                {s.slot + 1}
              </span>
            ),
          )
        )}
      </span>
    </button>
  );
}
