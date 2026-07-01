"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Loader2, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { StoreRewardsPreview } from "@/components/dashboard/store-rewards-preview";
import { secureApi } from "@/lib/api/client";
import {
  dispatchStoreCartUpdated,
  useStoreCart,
} from "@/lib/hooks/use-store-cart";
import { toast } from "@/lib/toast";
import { dispatchInventoryRefresh } from "@/lib/inventory/inventory-refresh-events";
import { cn } from "@/lib/utils";
import { ModalPortal } from "@/components/ui/modal-portal";

type CartLine = {
  storeItemId: string;
  quantity: number;
  lineTotalCents: number;
  item: {
    id: string;
    name: string;
    price: string;
    priceCents: number;
    productKind: "SKIN" | "PACKAGE" | "CASE" | "AGENT";
    imageUrl: string | null;
    canPurchase: boolean;
    maxPerUser: number | null;
    purchaseCount: number;
    rewardsPreview: {
      id: string;
      kind: string;
      catalogSkinId: string | null;
      label: string | null;
      imageUrl: string | null;
      subLabel: string | null;
      weight: number;
      quantity: number;
    }[];
  };
};

type CartData = {
  itemCount: number;
  subtotalCents: number;
  subtotal: string;
  items: CartLine[];
};

type CheckoutRow = {
  id: string;
  status: "PENDING" | "PAID" | "DELINQUENT" | "CANCELLED";
  total: string;
  totalCents: number;
  dueAt: string;
  itemCount: number;
};

function maxCartQuantity(line: CartLine): number {
  if (line.item.maxPerUser != null) {
    const remaining = line.item.maxPerUser - line.item.purchaseCount;
    return Math.max(1, Math.min(99, remaining));
  }
  return 99;
}

function formatLineTotal(line: CartLine): string {
  if (line.quantity <= 1) return line.item.price;
  return `${line.quantity}× ${line.item.price}`;
}

export function StoreCartDrawer() {
  const t = useTranslations("store.cart");
  const { open, closeCart } = useStoreCart();
  const [cart, setCart] = useState<CartData | null>(null);
  const [checkouts, setCheckouts] = useState<CheckoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cartRes, checkoutsRes] = await Promise.all([
        fetch("/api/store/cart", { credentials: "same-origin" }),
        fetch("/api/store/checkouts", { credentials: "same-origin" }),
      ]);
      const cartData = cartRes.ok ? await cartRes.json() : { cart: null };
      const checkoutsData = checkoutsRes.ok ? await checkoutsRes.json() : { checkouts: [] };
      setCart(cartData.cart ?? { itemCount: 0, subtotalCents: 0, subtotal: "R$ 0,00", items: [] });
      setCheckouts(checkoutsData.checkouts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    const onCartUpdate = () => {
      if (open) void load();
    };
    window.addEventListener("store-cart-updated", onCartUpdate);
    return () => window.removeEventListener("store-cart-updated", onCartUpdate);
  }, [open, load]);

  useEffect(() => {
    const onOpen = () => void load();
    window.addEventListener("store-cart-open", onOpen);
    return () => window.removeEventListener("store-cart-open", onOpen);
  }, [load]);

  async function updateQty(storeItemId: string, quantity: number) {
    setActing(storeItemId);
    const result = await secureApi<{ cart: CartData }>(
      `/api/store/cart/items/${storeItemId}`,
      { method: "PATCH", json: { quantity } },
    );
    setActing(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCart(result.data.cart);
    dispatchStoreCartUpdated();
  }

  async function handleCheckout() {
    setCheckingOut(true);
    const result = await secureApi<{ checkoutId: string; status: string; total: string }>(
      "/api/store/checkout",
      { method: "POST" },
    );
    setCheckingOut(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (result.data.status === "PAID") {
      toast.success(t("checkoutPaid"));
      dispatchInventoryRefresh();
      dispatchStoreCartUpdated();
      closeCart();
      void load();
      return;
    }

    toast.success(t("checkoutPending"));
    void load();
  }

  async function payCheckout(id: string) {
    setActing(id);
    const result = await secureApi("/api/store/checkout/" + id + "/pay", { method: "POST" });
    setActing(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("checkoutPaid"));
    dispatchInventoryRefresh();
    dispatchStoreCartUpdated();
    void load();
  }

  async function cancelCheckout(id: string) {
    setActing(id);
    const result = await secureApi("/api/store/checkout/" + id + "/cancel", { method: "POST" });
    setActing(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("checkoutCancelled"));
    void load();
  }

  const pendingCheckouts = checkouts.filter(
    (row) => row.status === "PENDING" || row.status === "DELINQUENT",
  );

  return (
    <AnimatePresence>
      {open && (
        <ModalPortal>
        <>
          <motion.button
            type="button"
            aria-label={t("close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="scrim-dismiss fixed inset-0 z-[90] bg-black/60"
            onClick={closeCart}
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-md flex-col border-l border-border glass-strong shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold">{t("title")}</h2>
                {cart && cart.itemCount > 0 && (
                  <p className="text-xs text-muted">
                    {t("itemsInCart", { count: cart.itemCount })}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground"
                onClick={closeCart}
                aria-label={t("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingCheckouts.length > 0 && (
                    <section className="alert-warning p-4">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-warning">
                        <AlertTriangle className="h-4 w-4" />
                        {t("pendingOrdersTitle")}
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {pendingCheckouts.map((row) => (
                          <li
                            key={row.id}
                            className="rounded-lg border border-border/60 p-3 text-sm"
                          >
                            <p className="font-medium">{row.total}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {row.itemCount} {t("items")} ·{" "}
                              {row.status === "DELINQUENT" ? (
                                <span className="text-rose-400">{t("statusDelinquent")}</span>
                              ) : (
                                t("dueDate", {
                                  date: new Date(row.dueAt).toLocaleDateString("pt-BR"),
                                })
                              )}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={acting === row.id}
                                onClick={() => void payCheckout(row.id)}
                              >
                                {acting === row.id ? (
                                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                                ) : (
                                  t("confirmPayment")
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={acting === row.id}
                                onClick={() => void cancelCheckout(row.id)}
                              >
                                {t("cancelOrder")}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {!cart || cart.items.length === 0 ? (
                    <div className="py-12 text-center">
                      <ShoppingBag className="mx-auto h-12 w-12 text-muted opacity-50" />
                      <p className="mt-4 text-sm text-muted">{t("empty")}</p>
                      <ButtonLink href="/dashboard/loja" variant="outline" className="mt-4" onClick={closeCart}>
                        {t("backToStore")}
                      </ButtonLink>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {cart.items.map((line) => {
                        const maxQty = maxCartQuantity(line);
                        const singleUnit = maxQty <= 1;
                        return (
                          <li
                            key={line.storeItemId}
                            className="rounded-xl border border-border/60 p-3"
                          >
                            <div className="flex gap-3">
                              {(line.item.imageUrl || line.item.rewardsPreview[0]?.imageUrl) && (
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/20">
                                  <RemoteImage
                                    src={
                                      line.item.imageUrl ??
                                      line.item.rewardsPreview[0]?.imageUrl ??
                                      ""
                                    }
                                    alt={line.item.name}
                                    width={56}
                                    height={56}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-display text-sm font-bold">
                                  <span className="mr-1.5 rounded bg-primary/20 px-1.5 py-0.5 text-xs font-bold text-primary">
                                    {line.quantity}×
                                  </span>
                                  {line.item.name}
                                </p>
                                <p className="text-xs text-primary">
                                  {formatLineTotal(line)}
                                </p>
                                {!line.item.canPurchase && (
                                  <p className="mt-1 text-[11px] text-warning">
                                    {t("itemUnavailable")}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {!singleUnit ? (
                                  <div className="flex items-center gap-0.5 rounded-lg border border-border">
                                    <button
                                      type="button"
                                      className="p-1.5 text-muted hover:text-foreground disabled:opacity-40"
                                      disabled={acting === line.storeItemId}
                                      onClick={() =>
                                        void updateQty(line.storeItemId, line.quantity - 1)
                                      }
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="min-w-8 text-center text-xs font-semibold">
                                      {line.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      className="p-1.5 text-muted hover:text-foreground disabled:opacity-40"
                                      disabled={
                                        acting === line.storeItemId || line.quantity >= maxQty
                                      }
                                      onClick={() =>
                                        void updateQty(line.storeItemId, line.quantity + 1)
                                      }
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  className="text-[10px] text-rose-400 hover:underline"
                                  onClick={() => void updateQty(line.storeItemId, 0)}
                                >
                                  <Trash2 className="inline h-3 w-3" /> {t("remove")}
                                </button>
                              </div>
                            </div>
                            <StoreRewardsPreview
                              productKind={line.item.productKind}
                              rewards={line.item.rewardsPreview}
                              className="mt-2"
                              compact
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {cart && cart.items.length > 0 && (
              <footer className="border-t border-border px-5 py-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">{t("summary")}</p>
                    <p className="font-display text-2xl font-bold">{cart.subtotal}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="mt-4 w-full"
                  disabled={checkingOut || cart.items.some((l) => !l.item.canPurchase)}
                  onClick={() => void handleCheckout()}
                >
                  {checkingOut ? (
                    <Loader2 className="h-5 w-5 motion-safe-spin" />
                  ) : (
                    t("checkout")
                  )}
                </Button>
                <ButtonLink href="/dashboard/loja" variant="outline" className="mt-2 w-full" onClick={closeCart}>
                  {t("continueShopping")}
                </ButtonLink>
              </footer>
            )}
          </motion.aside>
        </>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
}

export function StoreCartFab() {
  const t = useTranslations("store");
  const { count, open, toggleCart } = useStoreCart();

  if (count <= 0 && !open) return null;

  return (
    <button
      type="button"
      aria-label={t("viewCart")}
      aria-expanded={open}
      onClick={toggleCart}
      className={cn(
        "fixed bottom-6 right-6 z-[85] flex h-14 w-14 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
        "transition hover:scale-105 active:scale-95",
        count === 0 && "opacity-90",
      )}
    >
      <ShoppingBag className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[11px] font-bold text-primary ring-2 ring-primary">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
