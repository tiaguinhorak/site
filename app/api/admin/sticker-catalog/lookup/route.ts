import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { lookupStickerCatalogPreview } from "@/lib/inventory/sticker-catalog-admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const defIndex = Number(request.nextUrl.searchParams.get("defIndex"));
  if (!Number.isFinite(defIndex) || defIndex <= 0) {
    return NextResponse.json({ error: "defIndex válido é obrigatório." }, { status: 400 });
  }

  const preview = await lookupStickerCatalogPreview(defIndex);
  return NextResponse.json(preview);
}
