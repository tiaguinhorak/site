"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StoreSection } from "@/components/dashboard/store-section";
import { secureApi } from "@/lib/api/client";
import { useUser } from "@/lib/hooks/use-user";
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

type CoinShopTab = "buy" | "spend";

export function CoinShopSection() {
  const t = useTranslations("coinShop");
  const tWallet = useTranslations("wallet");
  const { user, patchUser } = useUser();
  const [tab, setTab] = useState<CoinShopTab>("spend");
  const [packs, setPacks] = useState<CoinPackView[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [busyPackId, setBusyPackId] = useState<string | null>(null);

  const loadPacks = useCallback(async () => {
    setLoadingPacks(true);
    try {
      const res = await fetch("/api/economy/coin-packs", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as { packs: CoinPackView[] };
        setPacks(data.packs ?? []);
      }
    } finally {
      setLoadingPacks(false);
    }
  }, []);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

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
    toast.success(tWallet("purchaseSuccess", { coins: pay.data.coinsAdded.toLocaleString("pt-BR") }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card glass p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15">
            <Coins className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("balanceLabel")}</p>
            <p className="font-display text-2xl font-bold text-foreground">
              {(user?.coins ?? 0).toLocaleString("pt-BR")}{" "}
              <span className="text-base font-semibold text-amber-300">{tWallet("coinsShort")}</span>
            </p>
          </div>
        </div>

        <div className="flex rounded-xl border border-border p-1">
          {(["spend", "buy"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                tab === id
                  ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary"
                  : "text-muted hover:text-foreground",
              )}
            >
              {id === "buy" ? t("tabBuy") : t("tabSpend")}
            </button>
          ))}
        </div>
      </div>

      {tab === "buy" ? (
        <section className="rounded-card glass p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold text-foreground">{t("packsTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("packsDesc")}</p>

          {loadingPacks ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
            </div>
          ) : packs.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted">{t("noPacks")}</p>
          ) : (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {packs.map((pack) => (
                <li
                  key={pack.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-border/60 p-4"
                >
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-foreground">
                      <Sparkles className="h-5 w-5 text-amber-400" />
                      {pack.totalCoins.toLocaleString("pt-BR")} {tWallet("coinsShort")}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {pack.bonusCoins > 0
                        ? tWallet("packBonus", { bonus: pack.bonusCoins.toLocaleString("pt-BR") })
                        : tWallet("packBase")}
                    </p>
                    {pack.badge === "popular" && (
                      <span className="mt-2 inline-block rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                        {tWallet("badgePopular")}
                      </span>
                    )}
                    {pack.badge === "best" && (
                      <span className="mt-2 inline-block rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
                        {tWallet("badgeBest")}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    disabled={busyPackId === pack.id}
                    onClick={() => void buyPack(pack.id)}
                  >
                    {busyPackId === pack.id ? (
                      <Loader2 className="h-5 w-5 motion-safe-spin" />
                    ) : (
                      pack.price
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <StoreSection shopMode="coins" />
      )}
    </div>
  );
}
