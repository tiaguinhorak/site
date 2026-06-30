import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const excludeItemId = request.nextUrl.searchParams.get("excludeItemId")?.trim() || undefined;

  const rows = await prisma.storeItemReward.findMany({
    where: excludeItemId ? { storeItemId: { not: excludeItemId } } : {},
    select: {
      catalogSkinId: true,
      agentDefIndex: true,
      stickerDefIndex: true,
    },
  });

  const catalogSkinIds = [
    ...new Set(rows.map((row) => row.catalogSkinId).filter((id): id is string => Boolean(id))),
  ];
  const agentDefIndexes = [
    ...new Set(
      rows.map((row) => row.agentDefIndex).filter((value): value is number => value != null),
    ),
  ];
  const stickerDefIndexes = [
    ...new Set(
      rows.map((row) => row.stickerDefIndex).filter((value): value is number => value != null),
    ),
  ];

  return NextResponse.json({ catalogSkinIds, agentDefIndexes, stickerDefIndexes });
}
