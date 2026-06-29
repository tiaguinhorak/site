import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { adminStoreCreateSchema } from "@/lib/admin/schemas";
import { storeItemWithRewardsInclude } from "@/lib/store/serialize";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const items = await prisma.storeItem.findMany({
    orderBy: { sortOrder: "asc" },
    include: storeItemWithRewardsInclude,
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-store-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminStoreCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const item = await prisma.storeItem.create({
    data: {
      ...parsed.data,
      originalCents: parsed.data.originalCents ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      maxPerUser: parsed.data.maxPerUser ?? null,
    },
    include: storeItemWithRewardsInclude,
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "STORE_CREATE",
    targetType: "store",
    targetId: item.id,
    summary: `Criou item de loja: ${item.name}`,
  });

  return NextResponse.json({ ok: true, item });
}
