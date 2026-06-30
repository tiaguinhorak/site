import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";
import { canCustomizeProfile } from "@/lib/profile/plan-profile-access";
import {
  ADMIN_RAINBOW_FRAME_ID,
  isValidBackgroundId,
  isValidBorderId,
  isValidFrameId,
  isValidProfileColor,
  isValidThemeId,
} from "@/lib/profile/customization-presets";
import { serializeOwnerCustomization } from "@/lib/profile/serialize-customization";

const patchSchema = z.object({
  profileBackgroundId: z.string().min(1).optional(),
  profileBackgroundColor: z.string().nullable().optional(),
  profileFrameId: z.string().min(1).optional(),
  profileFrameColor: z.string().nullable().optional(),
  profileAccentColor: z.string().nullable().optional(),
  profileThemeId: z.string().min(1).optional(),
  profileThemeColor: z.string().nullable().optional(),
  profileBorderId: z.string().min(1).optional(),
  profileBorderColor: z.string().nullable().optional(),
  profileShowPlanBadge: z.boolean().optional(),
  profileShowAchievements: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: {
      plan: true,
      isAdmin: true,
      profileBannerUrl: true,
      profileBannerMediaType: true,
      profileBannerModerationStatus: true,
      profileBackgroundId: true,
      profileBackgroundColor: true,
      profileFrameId: true,
      profileFrameColor: true,
      profileAccentColor: true,
      profileThemeId: true,
      profileThemeColor: true,
      profileBorderId: true,
      profileBorderColor: true,
      profileShowPlanBadge: true,
      profileShowAchievements: true,
      avatarMediaType: true,
      avatarModerationStatus: true,
    },
  });
  if (!user) return jsonError(404, "Usuário não encontrado.");

  return NextResponse.json(serializeOwnerCustomization(user));
}

export async function PATCH(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-customization",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { plan: true, isAdmin: true },
  });
  if (!user) return jsonError(404, "Usuário não encontrado.");
  if (!canCustomizeProfile(user.plan)) {
    return jsonError(403, "Personalização de perfil exclusiva para assinantes Elite.");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = patchSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  if (
    parsed.data.profileBackgroundId &&
    !isValidBackgroundId(parsed.data.profileBackgroundId)
  ) {
    return jsonError(400, "Background inválido.");
  }
  if (
    parsed.data.profileFrameId &&
    !isValidFrameId(parsed.data.profileFrameId, { isAdmin: user.isAdmin })
  ) {
    return jsonError(400, "Frame inválido.");
  }
  if (parsed.data.profileThemeId && !isValidThemeId(parsed.data.profileThemeId)) {
    return jsonError(400, "Tema inválido.");
  }
  if (parsed.data.profileBorderId && !isValidBorderId(parsed.data.profileBorderId)) {
    return jsonError(400, "Borda inválida.");
  }

  const colorFields = [
    parsed.data.profileBackgroundColor,
    parsed.data.profileFrameColor,
    parsed.data.profileAccentColor,
    parsed.data.profileThemeColor,
    parsed.data.profileBorderColor,
  ];
  if (colorFields.some((color) => !isValidProfileColor(color))) {
    return jsonError(400, "Cor inválida.");
  }

  if (parsed.data.profileFrameId === ADMIN_RAINBOW_FRAME_ID && !user.isAdmin) {
    return jsonError(403, "Frame rainbow exclusivo para administradores.");
  }

  const updated = await prisma.user.update({
    where: { id: session!.userId },
    data: parsed.data,
    select: {
      plan: true,
      isAdmin: true,
      nickname: true,
      profileBannerUrl: true,
      profileBannerMediaType: true,
      profileBannerModerationStatus: true,
      profileBackgroundId: true,
      profileBackgroundColor: true,
      profileFrameId: true,
      profileFrameColor: true,
      profileAccentColor: true,
      profileThemeId: true,
      profileThemeColor: true,
      profileBorderId: true,
      profileBorderColor: true,
      profileShowPlanBadge: true,
      profileShowAchievements: true,
      avatarMediaType: true,
      avatarModerationStatus: true,
    },
  });

  revalidatePath(`/player/${updated.nickname}`);

  return NextResponse.json({
    ok: true,
    ...serializeOwnerCustomization(updated),
  });
}
