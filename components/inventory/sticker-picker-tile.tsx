"use client";

import { Lock } from "lucide-react";
import { StickerImage } from "@/components/inventory/sticker-image";
import { surfaceSubtleClass } from "@/lib/ui/theme-surfaces";
import { cn } from "@/lib/utils";

type StickerPickerTileProps = {
  name: string;
  imageUrl: string | null;
  selected: boolean;
  compatible: boolean;
  lockTitle?: string;
  onSelect: () => void;
  sizeClass?: string;
};

export function StickerPickerTile({
  name,
  imageUrl,
  selected,
  compatible,
  lockTitle,
  onSelect,
  sizeClass = "max-h-20 max-w-20 sm:max-h-24 sm:max-w-24",
}: StickerPickerTileProps) {
  return (
    <button
      type="button"
      title={compatible ? name : lockTitle ?? name}
      aria-label={name}
      aria-pressed={selected}
      disabled={!compatible}
      onClick={() => {
        if (compatible) onSelect();
      }}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-xl border-2 p-3 transition-all",
        surfaceSubtleClass,
        selected && compatible
          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
          : "border-border/25",
        compatible && !selected && "hover:border-primary/30",
        !compatible && "cursor-not-allowed opacity-75",
      )}
    >
      {imageUrl ? (
        <StickerImage
          src={imageUrl}
          alt=""
          className={cn("h-full w-full object-contain", sizeClass)}
        />
      ) : (
        <div className="h-16 w-16 rounded-lg bg-white/5 sm:h-20 sm:w-20" />
      )}
      {!compatible && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[10px] bg-black/60 p-2"
          aria-hidden
        >
          <Lock className="h-5 w-5 shrink-0 text-foreground/95" />
          {lockTitle ? (
            <span className="line-clamp-3 text-center text-[9px] font-semibold leading-tight text-foreground/95">
              {lockTitle}
            </span>
          ) : null}
        </div>
      )}
    </button>
  );
}
