"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Gift, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModalPortal } from "@/components/ui/modal-portal";
import { SocialUserRow } from "@/components/social/social-user-row";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { dispatchInventoryRefresh } from "@/lib/inventory/inventory-refresh-events";
import { cn } from "@/lib/utils";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";

export type GiftRecipient = {
  id: string;
  nickname: string;
  displayName: string;
  country?: string;
  avatarUrl: string | null;
  plan?: string;
  level?: number;
  elo?: number;
  customization?: PublicProfileCustomization | null;
};

type GiftStoreItem = {
  id: string;
  name: string;
  coinPrice: number | null;
  canBuyWithCoins: boolean;
  canPurchase?: boolean;
  productKind: string;
  price?: string;
  priceCents?: number;
};

type GiftModalProps = {
  initialTarget?: GiftRecipient | null;
  presetItemId?: string;
  presetMode?: "coins" | "item";
  onClose: () => void;
  onDone?: () => void;
};

export function GiftModal({
  initialTarget = null,
  presetItemId,
  presetMode = "coins",
  onClose,
  onDone,
}: GiftModalProps) {
  const t = useTranslations("friends");
  const [recipient, setRecipient] = useState<GiftRecipient | null>(initialTarget);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GiftRecipient[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);
  const [mode, setMode] = useState<"coins" | "item">(presetItemId ? "item" : presetMode);
  const [amount, setAmount] = useState("100");
  const [items, setItems] = useState<GiftStoreItem[]>([]);
  const [itemId, setItemId] = useState(presetItemId ?? "");
  const [currency, setCurrency] = useState<"coins" | "brl">("coins");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetch("/api/store", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        const list: GiftStoreItem[] = (d.items ?? [])
          .filter(
            (i: GiftStoreItem & { canBuyWithCoins?: boolean; canPurchase?: boolean }) =>
              i.canBuyWithCoins || i.canPurchase,
          )
          .map((i: GiftStoreItem & { productKind?: string }) => ({
            id: i.id,
            name: i.name,
            coinPrice: i.coinPrice,
            canBuyWithCoins: i.canBuyWithCoins,
            canPurchase: i.canPurchase,
            productKind: i.productKind ?? "SKIN",
            price: i.price,
            priceCents: i.priceCents,
          }));
        setItems(list);
        if (presetItemId) {
          setItemId(presetItemId);
        } else if (list[0]) {
          setItemId(list[0].id);
        }
      })
      .catch(() => setItems([]));
  }, [presetItemId]);

  useEffect(() => {
    if (recipient || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      setSearching(true);
      fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        credentials: "same-origin",
      })
        .then((r) => r.json())
        .then((d) => setSearchResults(d.results ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, recipient]);

  const selectedItem = items.find((i) => i.id === itemId);
  const giftLabel =
    mode === "coins"
      ? t("giftConfirmCoins", { amount, nickname: recipient?.displayName ?? "?" })
      : t("giftConfirmItem", {
          item: selectedItem?.name ?? "—",
          nickname: recipient?.displayName ?? "?",
        });

  async function send() {
    if (busy || !recipient) return;
    setBusy(true);
    const result =
      mode === "coins"
        ? await secureApi("/api/gifts/coins", {
            method: "POST",
            json: {
              recipient: { type: "user" as const, value: recipient.id },
              amount: Number(amount),
            },
          })
        : await secureApi("/api/gifts/item", {
            method: "POST",
            json: {
              recipient: { type: "user" as const, value: recipient.id },
              storeItemId: itemId,
              currency,
            },
          });
    setBusy(false);
    setConfirmOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("giftSent", { nickname: recipient.displayName }));
    if (mode === "item") {
      dispatchInventoryRefresh();
    }
    onDone?.();
    onClose();
  }

  return (
    <ModalPortal>
      <>
        <motion.button
          type="button"
          aria-label={t("close")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-90 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          className="fixed left-1/2 top-1/2 z-91 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-card glass-strong p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <Gift className="h-5 w-5 text-primary" />
              {recipient
                ? t("giftTo", { nickname: recipient.displayName })
                : t("giftSomeoneTitle")}
            </h2>
            <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!recipient && (
            <div className="mt-4">
              <Input
                label={t("giftSearchLabel")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
              />
              {searching ? (
                <div className="mt-3 flex justify-center py-3">
                  <Loader2 className="h-5 w-5 motion-safe-spin text-primary" />
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="mt-3 max-h-40 overflow-y-auto rounded-card border border-border">
                  {searchResults.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => setRecipient(user)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                      >
                        <SocialUserRow user={user} nameClassName="text-sm" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : searchQuery.trim().length >= 2 ? (
                <p className="mt-2 text-xs text-muted">{t("noResults")}</p>
              ) : null}
            </div>
          )}

          {recipient && (
            <>
              {!initialTarget && (
                <button
                  type="button"
                  onClick={() => setRecipient(null)}
                  className="mt-3 text-xs font-medium text-primary hover:underline"
                >
                  {t("giftChangeRecipient")}
                </button>
              )}

              {!presetItemId && (
                <div className="mt-4 flex gap-2">
                  {(["coins", "item"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                        mode === m
                          ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-primary"
                          : "text-muted hover:text-foreground",
                      )}
                    >
                      {m === "coins" ? t("giftCoins") : t("giftItem")}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4">
                {mode === "coins" ? (
                  <Input
                    label={t("amount")}
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted">{t("noGiftItems")}</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                        {t("selectItem")}
                      </label>
                      <select
                        value={itemId}
                        onChange={(e) => setItemId(e.target.value)}
                        disabled={Boolean(presetItemId)}
                        className="w-full rounded-xl border border-border bg-[color-mix(in_srgb,var(--background)_80%,transparent)] px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-70"
                      >
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                            {item.productKind === "SUBSCRIPTION" ? ` (${t("giftSubscription")})` : ""}
                            {item.coinPrice
                              ? ` — ${item.coinPrice.toLocaleString("pt-BR")} `
                              : item.price
                                ? ` — ${item.price}`
                                : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedItem?.canBuyWithCoins && selectedItem.canPurchase && (
                      <div className="flex gap-2">
                        {(["coins", "brl"] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCurrency(c)}
                            className={cn(
                              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                              currency === c
                                ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-primary"
                                : "text-muted hover:text-foreground",
                            )}
                          >
                            {c === "coins" ? t("giftCoins") : t("giftPayBrl")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy || !recipient || (mode === "item" && !itemId)}
              onClick={() => setConfirmOpen(true)}
            >
              {busy ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Gift className="h-4 w-4" />}
              {t("send")}
            </Button>
          </div>

          {confirmOpen && recipient && (
            <>
              <motion.button
                type="button"
                aria-label={t("cancel")}
                className="fixed inset-0 z-92 bg-black/40"
                onClick={() => setConfirmOpen(false)}
              />
              <div className="fixed left-1/2 top-1/2 z-93 w-[min(90vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-card glass-strong p-5">
                <h3 className="font-display text-base font-bold text-foreground">
                  {t("giftConfirmTitle")}
                </h3>
                <p className="mt-2 text-sm text-muted">{giftLabel}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="button" variant="primary" disabled={busy} onClick={() => void send()}>
                    {t("send")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </>
    </ModalPortal>
  );
}
