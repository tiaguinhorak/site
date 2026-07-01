"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Coins,
  Loader2,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type CoinPackView = {
  id: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  priceCents: number;
  price: string;
  badge?: "popular" | "best";
};

export function WalletDropdown() {
  const t = useTranslations("wallet");
  const { user, patchUser, authenticated } = useUser();
  const [open, setOpen] = useState(false);
  const [packs, setPacks] = useState<CoinPackView[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyPackId, setBusyPackId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const packRes = await fetch("/api/economy/coin-packs", { credentials: "same-origin" });
      if (packRes.ok) {
        const data = (await packRes.json()) as { packs: CoinPackView[] };
        setPacks(data.packs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadCatalog();
  }, [open, loadCatalog]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function buyPack(packId: string) {
    setBusyPackId(packId);
    const create = await secureApi<{ checkoutId: string; price: string }>(
      "/api/economy/coin-packs/purchase",
      { method: "POST", json: { packId } },
    );
    if (!create.ok) {
      toast.error(create.error);
      setBusyPackId(null);
      return;
    }

    const pay = await secureApi<{ balance: number; coinsAdded: number }>(
      "/api/economy/coin-packs/pay",
      { method: "POST", json: { checkoutId: create.data.checkoutId } },
    );
    setBusyPackId(null);
    if (!pay.ok) {
      toast.error(pay.error);
      return;
    }

    patchUser({ coins: pay.data.balance });
    toast.success(t("purchaseSuccess", { coins: pay.data.coinsAdded.toLocaleString("pt-BR") }));
  }

  if (!authenticated || !user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3",
          "border-[color-mix(in_srgb,var(--primary)_25%,transparent)]",
          "bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
          "text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
          open && "ring-1 ring-primary/40",
        )}
      >
        <Coins className="h-4 w-4 text-amber-400" />
        <span className="font-mono tabular-nums">{user.coins.toLocaleString("pt-BR")}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass-nav-dropdown absolute right-0 top-[calc(100%+8px)] z-[90] w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl shadow-2xl"
          >
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <p className="font-display text-sm font-bold text-foreground">{t("title")}</p>
              </div>
              <p className="mt-1 text-xs text-muted">
                {t("balance", { coins: user.coins.toLocaleString("pt-BR") })}
              </p>
            </div>

            <div className="border-b border-border px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("tabBuy")}
              </p>
            </div>

            <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 motion-safe-spin text-primary" />
                </div>
              ) : (
                <ul className="space-y-2">
                  {packs.map((pack) => (
                    <li
                      key={pack.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
                          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                          {pack.totalCoins.toLocaleString("pt-BR")} {t("coinsShort")}
                          {pack.badge === "popular" && (
                            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                              {t("badgePopular")}
                            </span>
                          )}
                          {pack.badge === "best" && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">
                              {t("badgeBest")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {pack.bonusCoins > 0
                            ? t("packBonus", { bonus: pack.bonusCoins.toLocaleString("pt-BR") })
                            : t("packBase")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={busyPackId === pack.id}
                        onClick={() => void buyPack(pack.id)}
                      >
                        {busyPackId === pack.id ? (
                          <Loader2 className="h-4 w-4 motion-safe-spin" />
                        ) : (
                          pack.price
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border p-3">
              <ButtonLink href="/dashboard/loja-moedas" variant="primary" size="sm" className="w-full">
                <Coins className="h-4 w-4" />
                {t("openCoinShop")}
              </ButtonLink>
              <ButtonLink href="/dashboard/loja" variant="outline" size="sm" className="mt-2 w-full">
                <ShoppingBag className="h-4 w-4" />
                {t("openStore")}
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
