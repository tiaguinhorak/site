"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, Loader2, Package, ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type StoreProductKind = "SKIN" | "PACKAGE" | "CASE" | "AGENT";

type StoreRewardPreview = {
  id: string;
  kind: string;
  label: string | null;
  imageUrl: string | null;
  weight: number;
};

type StoreItem = {
  id: string;
  name: string;
  type: string;
  productKind: StoreProductKind;
  price: string;
  priceCents: number;
  originalPrice?: string;
  badge: string;
  description: string;
  accent: string;
  imageUrl: string | null;
  trending: boolean;
  featured: boolean;
  canPurchase: boolean;
  ownedSkin: boolean;
  purchaseCount: number;
  maxPerUser: number | null;
  rewardsPreview: StoreRewardPreview[];
};

type GrantedReward = {
  kind: string;
  name: string;
  imageUrl?: string | null;
  catalogSkinId?: string;
  alreadyOwned?: boolean;
};

type PurchaseResult = {
  storeItemName: string;
  productKind: StoreProductKind;
  granted: GrantedReward[];
};

function productKindLabel(kind: StoreProductKind, t: ReturnType<typeof useTranslations>): string {
  switch (kind) {
    case "SKIN":
      return t("kindSkin");
    case "CASE":
      return t("kindCase");
    case "PACKAGE":
      return t("kindPackage");
    case "AGENT":
      return t("kindAgent");
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function PurchaseResultModal({
  result,
  onClose,
}: {
  result: PurchaseResult;
  onClose: () => void;
}) {
  const t = useTranslations("store");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md rounded-card glass-strong p-6"
      >
        <button
          type="button"
          className="absolute right-4 top-4 text-muted hover:text-foreground"
          onClick={onClose}
          aria-label={t("close")}
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-display text-xl font-bold">
          {result.productKind === "CASE" ? t("caseOpenedTitle") : t("purchaseSuccessTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted">{result.storeItemName}</p>
        <ul className="mt-6 space-y-3">
          {result.granted.map((reward, index) => (
            <li
              key={`${reward.name}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/20">
                {reward.imageUrl ? (
                  <RemoteImage
                    src={reward.imageUrl}
                    alt={reward.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Package className="h-6 w-6 text-muted" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">{reward.name}</p>
                {reward.alreadyOwned && (
                  <p className="text-xs text-amber-400">{t("alreadyOwned")}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <ButtonLink href="/dashboard/inventario" variant="primary" className="flex-1">
            {t("goToInventory")}
          </ButtonLink>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            {t("continueShopping")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function StoreItemCard({
  item,
  featured,
  purchasingId,
  onPurchase,
}: {
  item: StoreItem;
  featured?: boolean;
  purchasingId: string | null;
  onPurchase: (item: StoreItem) => void;
}) {
  const t = useTranslations("store");
  const confirmPresets = useConfirmPresets();
  const isPurchasing = purchasingId === item.id;

  const statusLabel = item.ownedSkin
    ? t("owned")
    : item.maxPerUser != null && item.purchaseCount >= item.maxPerUser
      ? t("limitReached")
      : !item.canPurchase && item.rewardsPreview.length === 0
        ? t("unavailable")
        : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: featured ? 20 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-card glass p-5",
        featured && "glass-strong p-6 sm:p-8",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute rounded-full bg-gradient-to-br opacity-25 blur-2xl",
          featured ? "-right-20 -top-20 h-56 w-56 opacity-30 blur-3xl" : "-right-8 -top-8 h-24 w-24",
          item.accent,
        )}
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          {item.imageUrl && (
            <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/20 sm:block">
              <RemoteImage
                src={item.imageUrl}
                alt={item.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                {featured && <Flame className="h-3.5 w-3.5" />}
                {item.badge}
              </span>
              <span className="text-xs uppercase tracking-wider text-muted">
                {productKindLabel(item.productKind, t)}
              </span>
            </div>
            <p className="mt-2 font-display text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {item.type}
            </p>
            <h2
              className={cn(
                "mt-1 font-display font-bold text-foreground",
                featured ? "text-3xl sm:text-4xl" : "text-xl",
              )}
            >
              {item.name}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{item.description}</p>
            {item.productKind === "CASE" && item.rewardsPreview.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                {t("casePool", { count: item.rewardsPreview.length })}
              </p>
            )}
            <div className="mt-3 flex items-baseline gap-3">
              {item.originalPrice && (
                <span className="text-lg text-muted line-through">{item.originalPrice}</span>
              )}
              <span
                className={cn(
                  "font-display font-bold text-foreground",
                  featured ? "text-3xl" : "text-xl",
                )}
              >
                {item.priceCents === 0 ? t("free") : item.price}
              </span>
            </div>
            {statusLabel && (
              <p className="mt-2 text-sm font-medium text-amber-400">{statusLabel}</p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          size={featured ? "lg" : "md"}
          className="shrink-0"
          disabled={!item.canPurchase || isPurchasing}
          confirm={
            item.canPurchase
              ? confirmPresets.purchaseItem(item.name, item.priceCents === 0 ? t("free") : item.price)
              : undefined
          }
          onClick={() => onPurchase(item)}
        >
          {isPurchasing ? (
            <Loader2 className="h-5 w-5 motion-safe-spin" />
          ) : item.productKind === "CASE" ? (
            t("openCase")
          ) : (
            t("buyNow")
          )}
        </Button>
      </div>
    </motion.article>
  );
}

export function StoreSection() {
  const t = useTranslations("store");
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);

  const loadItems = useCallback(() => {
    setLoading(true);
    fetch("/api/store", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handlePurchase(item: StoreItem) {
    if (!item.canPurchase || purchasingId) return;

    setPurchasingId(item.id);
    const result = await secureApi<PurchaseResult>("/api/store/purchase", {
      method: "POST",
      json: { storeItemId: item.id },
    });
    setPurchasingId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setPurchaseResult(result.data);
    toast.success(
      item.productKind === "CASE" ? t("caseOpenedToast") : t("purchaseSuccessToast"),
    );
    loadItems();
  }

  if (loading) {
    return (
      <section className="flex justify-center rounded-card glass p-12">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-card glass p-8 text-center text-muted">
        <ShoppingBag className="mx-auto h-10 w-10 opacity-50" />
        <p className="mt-4">{t("empty")}</p>
      </section>
    );
  }

  const featured = items.find((i) => i.featured) ?? items[0];
  const others = items.filter((i) => i.id !== featured?.id);

  return (
    <>
      <section className="space-y-8">
        {featured && (
          <StoreItemCard
            item={featured}
            featured
            purchasingId={purchasingId}
            onPurchase={handlePurchase}
          />
        )}

        {others.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {others.map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                purchasingId={purchasingId}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {purchaseResult && (
          <PurchaseResultModal result={purchaseResult} onClose={() => setPurchaseResult(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
