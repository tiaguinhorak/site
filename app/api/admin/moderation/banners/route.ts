import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { notifyBannerModerationResult } from "@/lib/profile/gif-moderation-notifications";
import { revalidatePath } from "next/cache";

const patchSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const pending = await prisma.user.findMany({
    where: { profileBannerModerationStatus: "PENDING", profileBannerMediaType: "GIF" },
    select: {
      id: true,
      nickname: true,
      profileBannerUrl: true,
      profileBannerModerationStatus: true,
      plan: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ pending });
}

export async function PATCH(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-banner-moderation",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = patchSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, nickname: true, profileBannerMediaType: true },
  });
  if (!target) return jsonError(404, "Usuário não encontrado.");

  const status = parsed.data.action === "approve" ? "APPROVED" : "REJECTED";
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      profileBannerModerationStatus: status,
      ...(status === "REJECTED"
        ? {
            profileBannerUrl: null,
            profileBannerMediaType: "STATIC",
          }
        : {}),
    },
    select: {
      id: true,
      nickname: true,
      profileBannerModerationStatus: true,
      profileBannerUrl: true,
    },
  });

  await notifyBannerModerationResult(target.id, status === "APPROVED");
  revalidatePath(`/player/${updated.nickname}`);

  await logAdminAction({
    adminId: admin!.id,
    action: status === "APPROVED" ? "BANNER_APPROVE" : "BANNER_REJECT",
    targetType: "user",
    targetId: target.id,
    summary: `${status === "APPROVED" ? "Aprovou" : "Rejeitou"} banner GIF de ${target.nickname}`,
  });

  return NextResponse.json({ ok: true, user: updated });
}
