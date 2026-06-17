import { NextResponse } from "next/server";
import { getStoreItems } from "@/lib/queries";
import { formatPriceCents } from "@/lib/serializers";

export async function GET() {
  const items = await getStoreItems();
  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      price: formatPriceCents(item.priceCents),
      originalPrice: item.originalCents
        ? formatPriceCents(item.originalCents)
        : undefined,
      badge: item.badge,
      description: item.description,
      accent: item.accent,
      trending: item.trending,
      featured: item.featured,
    })),
  });
}
