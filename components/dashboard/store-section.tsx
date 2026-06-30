"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, Flame, Loader2, Package, ShoppingBag, ShoppingCart, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { useUser } from "@/lib/hooks/use-user";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { StoreRewardsPreview } from "@/components/dashboard/store-rewards-preview";
import { dispatchStoreCartOpen, dispatchStoreCartUpdated } from "@/lib/hooks/use-store-cart";

type StoreProductKind = "SKIN" | "PACKAGE" | "CASE" | "AGENT";

type StoreRewardPreview = {
  id: string;
  kind: string;
  catalogSkinId: string | null;
  label: string | null;
  imageUrl: string | null;
  subLabel: string | null;
  weight: number;
  quantity: number;
};

type StoreItem = {
  id: string;
  name: string;
  type: string;
  productKind: StoreProductKind;
  price: string;
  priceCents: number;
  originalPrice?: string;
  coinPrice: number | null;
  badge: string;
  description: string;
  accent: string;
  imageUrl: string | null;
  trending: boolean;
  featured: boolean;
  canPurchase: boolean;
  canBuyWithCoins: boolean;
  ownedSkin: boolean;
  inCart: boolean;
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
  addingToCartId,
  onPurchase,
  onAddToCart,
}: {
  item: StoreItem;
  featured?: boolean;
  purchasingId: string | null;
  addingToCartId: string | null;
  onPurchase: (item: StoreItem, currency: "brl" | "coins") => void;
  onAddToCart: (item: StoreItem) => void;
}) {
  const t = useTranslations("store");
  const confirmPresets = useConfirmPresets();
  const { user } = useUser();
  const isPurchasing = purchasingId === item.id;
  const isAddingToCart = addingToCartId === item.id;
  const coverImage = item.imageUrl ?? item.rewardsPreview[0]?.imageUrl ?? null;
  const userCoins = user?.coins ?? 0;
  const hasEnoughCoins = item.coinPrice != null && userCoins >= item.coinPrice;
  const coinPriceLabel = item.coinPrice != null ? item.coinPrice.toLocaleString("pt-BR") : null;

  const statusLabel = item.inCart
    ? t("inCart")
    : item.ownedSkin
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
        "relative w-full min-w-0 overflow-hidden rounded-card glass",
        featured ? "glass-strong p-5 sm:p-8" : "p-4 sm:p-5",
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

      <div className="relative flex min-w-0 flex-col gap-4">
        <div
          className={cn(
            "flex min-w-0 flex-col gap-4",
            featured && "lg:flex-row lg:items-start lg:justify-between lg:gap-6",
          )}
        >
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            {coverImage && (
              <div
                className={cn(
                  "mx-auto shrink-0 overflow-hidden rounded-xl border border-border/50 bg-black/20 sm:mx-0",
                  featured ? "h-24 w-24 sm:h-28 sm:w-28" : "h-20 w-20",
                )}
              >
                <RemoteImage
                  src={coverImage}
                  alt={item.name}
                  width={featured ? 112 : 80}
                  height={featured ? 112 : 80}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
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
                  "mt-1 break-words font-display font-bold leading-tight text-foreground",
                  featured ? "text-2xl sm:text-3xl lg:text-4xl" : "text-lg sm:text-xl",
                )}
              >
                {item.name}
              </h2>
              <p
                className={cn(
                  "mt-2 text-sm leading-relaxed text-muted",
                  featured ? "max-w-2xl" : "line-clamp-3 sm:line-clamp-none",
                )}
              >
                {item.description}
              </p>
              <div className="mt-3 flex flex-wrap items-baseline justify-center gap-3 sm:justify-start">
                {item.originalPrice && (
                  <span className="text-base text-muted line-through sm:text-lg">{item.originalPrice}</span>
                )}
                <span
                  className={cn(
                    "font-display font-bold text-foreground",
                    featured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
                  )}
                >
                  {item.priceCents === 0 ? t("free") : item.price}
                </span>
                {coinPriceLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-sm font-semibold text-amber-300">
                    <Coins className="h-4 w-4" />
                    {coinPriceLabel}
                  </span>
                )}
              </div>
              {statusLabel && (
                <p className="mt-2 text-sm font-medium text-amber-400">{statusLabel}</p>
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex w-full min-w-0 flex-col gap-2",
              featured && "lg:w-auto lg:min-w-[220px] lg:shrink-0",
            )}
          >
            <Button
              type="button"
              variant="outline"
              size={featured ? "lg" : "md"}
              className="w-full"
              disabled={!item.canPurchase || item.inCart || isAddingToCart || isPurchasing}
              onClick={() => onAddToCart(item)}
            >
              {isAddingToCart ? (
                <Loader2 className="h-5 w-5 motion-safe-spin" />
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  {t("addToCart")}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="primary"
              size={featured ? "lg" : "md"}
              className="w-full"
              disabled={!item.canPurchase || isPurchasing || isAddingToCart}
              confirm={
                item.canPurchase
                  ? confirmPresets.purchaseItem(item.name, item.priceCents === 0 ? t("free") : item.price)
                  : undefined
              }
              onClick={() => onPurchase(item, "brl")}
            >
              {isPurchasing ? (
                <Loader2 className="h-5 w-5 motion-safe-spin" />
              ) : item.productKind === "CASE" ? (
                t("openCase")
              ) : (
                t("buyNow")
              )}
            </Button>
            {item.canBuyWithCoins && coinPriceLabel && (
              <Button
                type="button"
                variant="glass"
                size={featured ? "lg" : "md"}
                className="w-full"
                disabled={!hasEnoughCoins || isPurchasing || isAddingToCart}
                confirm={
                  hasEnoughCoins
                    ? confirmPresets.purchaseItem(item.name, `${coinPriceLabel} ${t("coinsLabel")}`)
                    : undefined
                }
                onClick={() => onPurchase(item, "coins")}
              >
                <Coins className="h-4 w-4" />
                {hasEnoughCoins ? t("buyWithCoins") : t("notEnoughCoins")}
              </Button>
            )}
          </div>
        </div>

        {item.rewardsPreview.length > 0 && (
          <div className="min-w-0 border-t border-border/40 pt-4">
            <StoreRewardsPreview
              productKind={item.productKind}
              rewards={item.rewardsPreview}
              featured={featured}
              compact={!featured}
            />
          </div>
        )}
      </div>
    </motion.article>
  );
}

export function StoreSection() {
  const t = useTranslations("store");
  const { refresh } = useUser();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
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

  async function handleAddToCart(item: StoreItem) {
    if (!item.canPurchase || addingToCartId || purchasingId) return;

    setAddingToCartId(item.id);
    const result = await secureApi("/api/store/cart", {
      method: "POST",
      json: { storeItemId: item.id, quantity: 1 },
    });
    setAddingToCartId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(t("addedToCart"));
    dispatchStoreCartUpdated();
    dispatchStoreCartOpen();
    loadItems();
  }

  async function handlePurchase(item: StoreItem, currency: "brl" | "coins") {
    if (purchasingId) return;
    if (currency === "brl" && !item.canPurchase) return;
    if (currency === "coins" && !item.canBuyWithCoins) return;

    setPurchasingId(item.id);
    const result = await secureApi<PurchaseResult>("/api/store/purchase", {
      method: "POST",
      json: { storeItemId: item.id, currency },
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
    if (currency === "coins") {
      void refresh();
    }
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
      <section className="space-y-6 sm:space-y-8">
        {featured && (
          <StoreItemCard
            item={featured}
            featured
            purchasingId={purchasingId}
            addingToCartId={addingToCartId}
            onPurchase={handlePurchase}
            onAddToCart={handleAddToCart}
          />
        )}

        {others.length > 0 && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {others.map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                purchasingId={purchasingId}
                addingToCartId={addingToCartId}
                onPurchase={handlePurchase}
                onAddToCart={handleAddToCart}
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
