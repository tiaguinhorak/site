"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type StoreCartContextValue = {
  count: number;
  cartItemIds: Set<string>;
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  refresh: () => void;
};

const StoreCartContext = createContext<StoreCartContextValue | null>(null);

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [cartItemIds, setCartItemIds] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const refresh = useCallback(() => {
    fetch("/api/store/cart", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { cart: null }))
      .then((data: { cart?: { itemCount?: number; items?: { storeItemId: string }[] } | null }) => {
        const cart = data.cart;
        setCount(cart?.itemCount ?? 0);
        setCartItemIds(new Set((cart?.items ?? []).map((row) => row.storeItemId)));
      })
      .catch(() => {
        setCount(0);
        setCartItemIds(new Set());
      });
  }, []);

  useEffect(() => {
    refresh();
    const onCartChange = () => refresh();
    const onCartOpen = () => setOpen(true);
    window.addEventListener("store-cart-updated", onCartChange);
    window.addEventListener("store-cart-open", onCartOpen);
    return () => {
      window.removeEventListener("store-cart-updated", onCartChange);
      window.removeEventListener("store-cart-open", onCartOpen);
    };
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get("cart") === "1" || searchParams.get("cart") === "open") {
      setOpen(true);
    }
  }, [pathname, searchParams]);

  const value = useMemo(
    () => ({
      count,
      cartItemIds,
      open,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      toggleCart: () => setOpen((v) => !v),
      refresh,
    }),
    [count, cartItemIds, open, refresh],
  );

  return <StoreCartContext.Provider value={value}>{children}</StoreCartContext.Provider>;
}

export function useStoreCart() {
  const ctx = useContext(StoreCartContext);
  if (!ctx) {
    throw new Error("useStoreCart must be used within StoreCartProvider");
  }
  return ctx;
}

export function useStoreCartCount() {
  const { count, refresh } = useStoreCart();
  return { count, refresh };
}

export function dispatchStoreCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("store-cart-updated"));
  }
}

export function dispatchStoreCartOpen() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("store-cart-open"));
  }
}
