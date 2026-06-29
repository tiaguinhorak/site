"use client";

import { useTranslations } from "next-intl";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";
import { surfaceSubtleClass } from "@/lib/ui/theme-surfaces";

export type SkinVariantItem = {
  catalogSkinId: string;
  name: string;
  imageUrl: string | null;
  accent: string;
  owned?: boolean;
  equippedT?: boolean;
  equippedCT?: boolean;
};

type WeaponSkinVariantStripProps = {
  variants: SkinVariantItem[];
  selectedId: string;
  loading?: boolean;
  onSelect: (variant: SkinVariantItem) => void;
};

export function WeaponSkinVariantStrip({
  variants,
  selectedId,
  loading,
  onSelect,
}: WeaponSkinVariantStripProps) {
  const t = useTranslations("inventory");

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]"
          />
        ))}
      </div>
    );
  }

  if (variants.length <= 1) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {t("workspaceSkinVariantsLabel")}
      </p>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {variants.map((variant) => {
          const selected = variant.catalogSkinId === selectedId;
          const equipped = variant.equippedT || variant.equippedCT;
          return (
            <button
              key={variant.catalogSkinId}
              type="button"
              title={variant.name}
              onClick={() => onSelect(variant)}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                surfaceSubtleClass,
                selected
                  ? "border-primary ring-2 ring-primary/35"
                  : "border-border/30 hover:border-primary/40",
                !variant.owned && "opacity-55",
              )}
              aria-pressed={selected}
            >
              {variant.imageUrl ? (
                <RemoteImage
                  src={variant.imageUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              ) : (
                <div className={cn("h-full w-full bg-linear-to-br opacity-40", variant.accent)} />
              )}
              {equipped && (
                <span
                  className="absolute bottom-0 inset-x-0 bg-emerald-500/90 py-px text-[8px] font-bold uppercase text-white"
                  aria-hidden
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
