export type CoinPack = {
  id: string;
  coins: number;
  bonusCoins: number;
  priceCents: number;
  badge?: "popular" | "best";
};

export const COIN_PACKS: readonly CoinPack[] = [
  { id: "starter", coins: 500, bonusCoins: 0, priceCents: 499 },
  { id: "plus", coins: 1200, bonusCoins: 200, priceCents: 999, badge: "popular" },
  { id: "pro", coins: 2800, bonusCoins: 700, priceCents: 1999 },
  { id: "elite", coins: 6500, bonusCoins: 2000, priceCents: 3999, badge: "best" },
] as const;

export function getCoinPack(id: string): CoinPack | undefined {
  return COIN_PACKS.find((pack) => pack.id === id);
}

export function totalCoinsInPack(pack: CoinPack): number {
  return pack.coins + pack.bonusCoins;
}
