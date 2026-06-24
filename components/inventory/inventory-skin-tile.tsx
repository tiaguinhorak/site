"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { TeamEquipBadge } from "@/components/inventory/team-equip-badge";
import { SkinRarityLine } from "@/components/skins/skin-rarity-line";
import { cn } from "@/lib/utils";

type InventorySkinTileProps = {
  name: string;
  imageUrl: string | null;
  accent: string;
  rarity?: string;
  equippedT?: boolean;
  equippedCT?: boolean;
  locked?: boolean;
  onClick?: () => void;
  className?: string;
  artClassName?: string;
  children?: ReactNode;
};

export function InventorySkinTile({
  name,
  imageUrl,
  accent,
  rarity,
  equippedT = false,
  equippedCT = false,
  locked = false,
  onClick,
  className,
  artClassName = "h-20 w-full",
  children,
}: InventorySkinTileProps) {
  const interactive = Boolean(onClick);

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]",
        interactive &&
          "cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        locked && "opacity-80",
        className,
      )}
    >
      {locked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35">
          <Lock className="h-6 w-6 text-foreground/90" aria-hidden />
        </div>
      )}
      <SkinRarityLine rarity={rarity} accent={accent} />
      <div className="relative p-2.5 pb-2">
        <TeamEquipBadge
          equippedT={equippedT}
          equippedCT={equippedCT}
          className="absolute right-2 top-2 z-10"
        />
        <InventoryItemArt imageUrl={imageUrl} accent={accent} className={artClassName} />
      </div>
      <div className="px-2.5 pb-2.5">
        <p className="line-clamp-2 text-center text-[11px] font-semibold leading-snug text-foreground">
          {name}
        </p>
        {children}
      </div>
      <SkinRarityLine rarity={rarity} accent={accent} position="bottom" />
    </article>
  );
}
