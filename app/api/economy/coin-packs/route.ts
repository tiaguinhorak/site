import { NextResponse } from "next/server";
import { COIN_PACKS, totalCoinsInPack } from "@/lib/economy/coin-packs";
import { formatPriceCents } from "@/lib/serializers";

export async function GET() {
  return NextResponse.json({
    packs: COIN_PACKS.map((pack) => ({
      id: pack.id,
      coins: pack.coins,
      bonusCoins: pack.bonusCoins,
      totalCoins: totalCoinsInPack(pack),
      priceCents: pack.priceCents,
      price: formatPriceCents(pack.priceCents),
      badge: pack.badge ?? null,
    })),
  });
}
