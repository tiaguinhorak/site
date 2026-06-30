"use client";

import { useState } from "react";
import { ChevronDown, UserRound, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { StickerImage } from "@/components/inventory/sticker-image";
import { RemoteImage } from "@/components/ui/remote-image";
import {
  StoreRewardPreviewModal,
  storeRewardItemToPreviewTarget,
  type StoreRewardPreviewTarget,
} from "@/components/store/reward-preview-modal";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { storeRewardToPreview } from "@/lib/inventory/skin-preview-mappers";
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

const LIST_COLLAPSE_AT = 6;

function rewardImageUrl(reward: StoreRewardPreviewItem): string | null {
  if (reward.imageUrl) return reward.imageUrl;
  if (reward.catalogSkinId) return catalogSkinImageUrl(reward.catalogSkinId);
  return null;
}

function canPreviewReward(reward: StoreRewardPreviewItem): boolean {
  if (reward.kind === "CATALOG_SKIN") return Boolean(reward.catalogSkinId);
  if (reward.kind === "AGENT" || reward.kind === "STICKER") return true;
  return false;
}

function RewardListRow({
  reward,
  showWeight,
  totalWeight,
  onPreview,
  dense,
}: {
  reward: StoreRewardPreviewItem;
  showWeight?: boolean;
  totalWeight?: number;
  onPreview?: () => void;
  dense?: boolean;
}) {
  const t = useTranslations("store");
  const image = rewardImageUrl(reward);
  const chancePct =
    showWeight && totalWeight && totalWeight > 0
      ? Math.round((reward.weight / totalWeight) * 100)
      : null;
  const qtyPrefix = reward.quantity > 1 ? `${reward.quantity}× ` : "";
  const previewable = Boolean(onPreview);

  const thumb = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-black/30",
        dense ? "h-10 w-11" : "h-12 w-14",
        previewable && "ring-0 transition hover:ring-2 hover:ring-primary/40",
      )}
    >
      {reward.kind === "STICKER" ? (
        <div className="flex h-full w-full items-center justify-center">
          <StickerImage
            src={image}
            alt={reward.label ?? ""}
            className={cn("object-contain", dense ? "h-8 w-8" : "h-10 w-10")}
          />
        </div>
      ) : reward.kind === "AGENT" ? (
        image ? (
          <RemoteImage
            src={image}
            alt={reward.label ?? "Agente"}
            width={56}
            height={48}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserRound className="h-5 w-5 text-muted" />
          </div>
        )
      ) : (
        <InventoryItemArt
          imageUrl={image}
          accent={rarityAccent(reward.subLabel ?? "common")}
          className="h-full w-full"
          imagePreset="skin-grid"
        />
      )}
      {previewable && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
          <ZoomIn className="h-4 w-4 text-white" />
        </span>
      )}
    </div>
  );

  return (
    <li className="group rounded-xl border border-border/50 bg-black/10">
      {previewable ? (
        <button
          type="button"
          className="flex w-full items-start gap-3 p-2.5 text-left transition hover:bg-black/15"
          onClick={onPreview}
        >
          {thumb}
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium leading-snug text-foreground", dense ? "text-xs" : "text-sm")}>
              {qtyPrefix}
              {reward.label ?? t("unknownReward")}
            </p>
            {reward.subLabel ? (
              <p className="mt-0.5 text-[11px] capitalize text-muted">{reward.subLabel}</p>
            ) : null}
            {chancePct != null ? (
              <p className="mt-0.5 text-[11px] text-muted">{t("dropChance", { percent: chancePct })}</p>
            ) : null}
          </div>
        </button>
      ) : (
        <div className="flex items-start gap-3 p-2.5">
          {thumb}
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium leading-snug text-foreground", dense ? "text-xs" : "text-sm")}>
              {qtyPrefix}
              {reward.label ?? t("unknownReward")}
            </p>
            {reward.subLabel ? (
              <p className="mt-0.5 text-[11px] capitalize text-muted">{reward.subLabel}</p>
            ) : null}
            {chancePct != null ? (
              <p className="mt-0.5 text-[11px] text-muted">{t("dropChance", { percent: chancePct })}</p>
            ) : null}
          </div>
        </div>
      )}
    </li>
  );
}

export function StoreRewardsPreview({
  productKind,
  rewards,
  featured,
  className,
  compact = false,
}: {
  productKind: StoreProductKind;
  rewards: StoreRewardPreviewItem[];
  featured?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("store");
  const [expanded, setExpanded] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<StoreRewardPreviewTarget | null>(null);

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

  function handlePreview(reward: StoreRewardPreviewItem) {
    const target = storeRewardItemToPreviewTarget({
      ...reward,
      toSkinPreview: storeRewardToPreview,
    });
    if (target) setPreviewTarget(target);
  }

  function previewHandler(reward: StoreRewardPreviewItem) {
    return canPreviewReward(reward) ? () => handlePreview(reward) : undefined;
  }

  const useList =
    productKind === "PACKAGE" ||
    productKind === "CASE" ||
    compact ||
    ((productKind === "SKIN" || productKind === "AGENT") && rewards.length > 1);
  const collapseAt = LIST_COLLAPSE_AT;
  const visible = expanded ? rewards : rewards.slice(0, collapseAt);
  const hiddenCount = rewards.length - collapseAt;

  if ((productKind === "SKIN" || productKind === "AGENT") && !compact && rewards.length === 1) {
    const reward = rewards[0]!;
    return (
      <div className={cn("mt-3", className)}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          {t(titleKey)}
        </p>
        <ul className="mt-2 max-w-lg">
          <RewardListRow reward={reward} onPreview={previewHandler(reward)} />
        </ul>
        <p className="mt-2 text-[10px] text-muted">{t("rewardsPreviewHint")}</p>
        <StoreRewardPreviewModal
          open={previewTarget != null}
          target={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      </div>
    );
  }

  if (useList) {
    return (
      <div className={cn("mt-2", className)}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            {t(titleKey)}
          </p>
          <span className="text-[11px] text-muted">
            {productKind === "CASE"
              ? t("casePoolHint", { count: rewards.length })
              : t("packageItemsCount", { count: rewards.length })}
          </span>
        </div>
        <ul
          className={cn(
            "mt-2 space-y-1.5",
            featured && !compact && "xl:grid xl:grid-cols-2 xl:gap-2 xl:space-y-0",
          )}
        >
          {visible.map((reward) => (
            <RewardListRow
              key={reward.id}
              reward={reward}
              showWeight={productKind === "CASE"}
              totalWeight={totalWeight}
              dense={compact}
              onPreview={previewHandler(reward)}
            />
          ))}
        </ul>
        {hiddenCount > 0 && !expanded && (
          <button
            type="button"
            className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={() => setExpanded(true)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            {t("rewardsShowMore", { count: hiddenCount })}
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-muted hover:text-foreground"
            onClick={() => setExpanded(false)}
          >
            {t("rewardsShowLess")}
          </button>
        )}
        <p className="mt-2 text-[10px] text-muted">{t("rewardsPreviewHint")}</p>
        <StoreRewardPreviewModal
          open={previewTarget != null}
          target={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      </div>
    );
  }

  return (
    <div className={cn("mt-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        {t(titleKey)}
      </p>
      <ul className="mt-2 space-y-1.5">
        {rewards.map((reward) => (
          <RewardListRow key={reward.id} reward={reward} onPreview={previewHandler(reward)} />
        ))}
      </ul>
      <StoreRewardPreviewModal
        open={previewTarget != null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
