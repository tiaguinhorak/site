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
import { adminStoreRewardsPutSchema } from "@/lib/admin/schemas";
import {
  serializeStoreReward,
  storeItemWithRewardsInclude,
} from "@/lib/store/serialize";
import { loadAgentPreviewMap, collectAgentDefIndexesFromStoreItems } from "@/lib/store/agent-preview-map";
import {
  collectStickerDefIndexesFromStoreItems,
  loadStickerPreviewMap,
} from "@/lib/store/sticker-preview-map";
import { validateStoreRewardDuplicates } from "@/lib/store/reward-validation";

function validateRewardRows(
  productKind: string,
  rewards: { kind: string; catalogSkinId?: string | null; agentDefIndex?: number | null; stickerDefIndex?: number | null }[],
): string | null {
  if (rewards.length === 0) {
    return "Adicione ao menos uma recompensa.";
  }

  for (const reward of rewards) {
    if (reward.kind === "CATALOG_SKIN" && !reward.catalogSkinId) {
      return "Recompensa de skin precisa de catalogSkinId.";
    }
    if (reward.kind === "AGENT" && !reward.agentDefIndex) {
      return "Recompensa de agente precisa de agentDefIndex.";
    }
    if (reward.kind === "STICKER" && !reward.stickerDefIndex) {
      return "Recompensa de sticker precisa de stickerDefIndex.";
    }
  }

  switch (productKind) {
    case "SKIN":
    case "AGENT":
    case "CASE":
    case "PACKAGE":
      break;
    default:
      return "Tipo de produto inválido.";
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const item = await prisma.storeItem.findUnique({
    where: { id },
    include: storeItemWithRewardsInclude,
  });
  if (!item) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  const agentByDef = await loadAgentPreviewMap(collectAgentDefIndexesFromStoreItems([item]));
  const stickerByDef = await loadStickerPreviewMap(collectStickerDefIndexesFromStoreItems([item]));

  return NextResponse.json({
    rewards: item.rewards.map((reward) =>
      serializeStoreReward(reward, { agentByDef, stickerByDef }),
    ),
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-store-rewards",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.storeItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminStoreRewardsPutSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const validationProductKind = parsed.data.productKind ?? existing.productKind;

  if (parsed.data.productKind && parsed.data.productKind !== existing.productKind) {
    await prisma.storeItem.update({
      where: { id },
      data: { productKind: parsed.data.productKind },
    });
  }

  const validationError = validateRewardRows(validationProductKind, parsed.data.rewards);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const duplicateError = await validateStoreRewardDuplicates(id, parsed.data.rewards);
  if (duplicateError) {
    return NextResponse.json({ error: duplicateError }, { status: 409 });
  }

  const rewards = await prisma.$transaction(async (tx) => {
    await tx.storeItemReward.deleteMany({ where: { storeItemId: id } });
    await tx.storeItemReward.createMany({
      data: parsed.data.rewards.map((reward, index) => ({
        storeItemId: id,
        kind: reward.kind,
        catalogSkinId: reward.kind === "CATALOG_SKIN" ? reward.catalogSkinId : null,
        agentDefIndex: reward.kind === "AGENT" ? reward.agentDefIndex : null,
        stickerDefIndex: reward.kind === "STICKER" ? reward.stickerDefIndex : null,
        weight: reward.weight,
        quantity: reward.quantity,
        sortOrder: reward.sortOrder ?? index,
      })),
    });
    const item = await tx.storeItem.findUniqueOrThrow({
      where: { id },
      include: storeItemWithRewardsInclude,
    });
    return item.rewards;
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "STORE_UPDATE",
    targetType: "store",
    targetId: id,
    summary: `Atualizou recompensas: ${existing.name} (${rewards.length})`,
  });

  const agentByDef = await loadAgentPreviewMap(
    collectAgentDefIndexesFromStoreItems([{ rewards }]),
  );
  const stickerByDef = await loadStickerPreviewMap(
    collectStickerDefIndexesFromStoreItems([{ rewards }]),
  );

  return NextResponse.json({
    ok: true,
    rewards: rewards.map((reward) => serializeStoreReward(reward, { agentByDef, stickerByDef })),
  });
}
