"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { RemoteImage } from "@/components/ui/remote-image";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { cn } from "@/lib/utils";

type StoreProductKind = "SKIN" | "PACKAGE" | "CASE" | "AGENT";

export type StoreRewardPreviewItem = {
  id: string;
  kind: string;
  catalogSkinId?: string | null;
  label: string | null;
  imageUrl: string | null;
  subLabel: string | null;
  weight: number;
  quantity: number;
};

function rewardImageUrl(reward: StoreRewardPreviewItem): string | null {
  if (reward.imageUrl) return reward.imageUrl;
  if (reward.catalogSkinId) return catalogSkinImageUrl(reward.catalogSkinId);
  return null;
}

function RewardThumb({
  reward,
  size = "md",
}: {
  reward: StoreRewardPreviewItem;
  size?: "sm" | "md" | "lg";
}) {
  const image = rewardImageUrl(reward);
  const accent = rarityAccent(reward.subLabel ?? "common");
  const sizeClass =
    size === "lg" ? "h-20 w-24" : size === "sm" ? "h-12 w-14" : "h-16 w-20";

  if (reward.kind === "AGENT") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30",
          sizeClass,
        )}
      >
        {image ? (
          <RemoteImage
            src={image}
            alt={reward.label ?? "Agente"}
            width={80}
            height={96}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <UserRound className="h-6 w-6 text-muted" />
        )}
      </div>
    );
  }

  return (
    <InventoryItemArt
      imageUrl={image}
      accent={accent}
      className={cn("shrink-0", sizeClass)}
      imagePreset="skin-grid"
    />
  );
}

function RewardRow({
  reward,
  showWeight,
  totalWeight,
  compact,
}: {
  reward: StoreRewardPreviewItem;
  showWeight?: boolean;
  totalWeight?: number;
  compact?: boolean;
}) {
  const t = useTranslations("store");
  const chancePct =
    showWeight && totalWeight && totalWeight > 0
      ? Math.round((reward.weight / totalWeight) * 100)
      : null;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-black/10",
        compact ? "p-2" : "p-3",
      )}
    >
      <RewardThumb reward={reward} size={compact ? "sm" : "md"} />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
          {reward.label ?? t("unknownReward")}
          {reward.quantity > 1 ? (
            <span className="ml-1 text-primary">×{reward.quantity}</span>
          ) : null}
        </p>
        {reward.subLabel ? (
          <p className="truncate text-[11px] capitalize text-muted">{reward.subLabel}</p>
        ) : null}
        {chancePct != null ? (
          <p className="text-[11px] text-muted">{t("dropChance", { percent: chancePct })}</p>
        ) : null}
      </div>
    </li>
  );
}

export function StoreRewardsPreview({
  productKind,
  rewards,
  featured,
  className,
}: {
  productKind: StoreProductKind;
  rewards: StoreRewardPreviewItem[];
  featured?: boolean;
  className?: string;
}) {
  const t = useTranslations("store");

  if (rewards.length === 0) {
    return (
      <p className={cn("text-sm text-amber-400/90", className)}>{t("rewardsNotConfigured")}</p>
    );
  }

  const titleKey =
    productKind === "SKIN"
      ? "rewardsTitleSkin"
      : productKind === "PACKAGE"
        ? "rewardsTitlePackage"
        : productKind === "CASE"
          ? "rewardsTitleCase"
          : "rewardsTitleAgent";

  const totalWeight = rewards.reduce((sum, row) => sum + Math.max(0, row.weight), 0);

  if (productKind === "SKIN" || productKind === "AGENT") {
    const reward = rewards[0]!;
    return (
      <div className={cn("mt-4", className)}>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t(titleKey)}</p>
        <div
          className={cn(
            "mt-2 flex items-center gap-4 rounded-xl border border-border/60 bg-black/10 p-3",
            featured && "p-4",
          )}
        >
          <RewardThumb reward={reward} size={featured ? "lg" : "md"} />
          <div>
            <p className={cn("font-display font-bold text-foreground", featured ? "text-xl" : "text-base")}>
              {reward.label}
            </p>
            {reward.subLabel ? (
              <p className="mt-0.5 text-sm capitalize text-muted">{reward.subLabel}</p>
            ) : null}
            {productKind === "AGENT" ? (
              <p className="mt-1 text-xs text-muted">{t("agentEquipHint")}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">{t("skinInventoryHint")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (productKind === "CASE") {
    return (
      <div className={cn("mt-4", className)}>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t(titleKey)}</p>
        <p className="mt-1 text-xs text-muted">{t("casePoolHint", { count: rewards.length })}</p>
        <ul
          className={cn(
            "mt-3 grid gap-2",
            featured ? "sm:grid-cols-2" : "grid-cols-1",
          )}
        >
          {rewards.map((reward) => (
            <RewardRow
              key={reward.id}
              reward={reward}
              showWeight
              totalWeight={totalWeight}
              compact={!featured}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("mt-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t(titleKey)}</p>
      <p className="mt-1 text-xs text-muted">
        {t("packageItemsCount", { count: rewards.length })}
      </p>
      <ul className="mt-3 space-y-2">
        {rewards.map((reward) => (
          <RewardRow key={reward.id} reward={reward} compact={!featured} />
        ))}
      </ul>
    </div>
  );
}
