"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type TeamEquipBadgeProps = {
  equippedT: boolean;
  equippedCT: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function TeamEquipBadge({
  equippedT,
  equippedCT,
  className,
  size = "sm",
}: TeamEquipBadgeProps) {
  const t = useTranslations("inventory");

  if (!equippedT && !equippedCT) return null;

  const pill = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      title={
        equippedT && equippedCT
          ? t("teamBadgeBoth")
          : equippedT
            ? t("teamBadgeT")
            : t("teamBadgeCT")
      }
    >
      {equippedT && (
        <span
          className={cn(
            pill,
            "badge-amber rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
          )}
        >
          TR
        </span>
      )}
      {equippedCT && (
        <span
          className={cn(
            pill,
            "rounded font-bold uppercase tracking-wide text-sky-400 ring-1 ring-sky-400/30 bg-sky-400/10",
          )}
        >
          CT
        </span>
      )}
    </div>
  );
}
