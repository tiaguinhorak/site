import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import {
  applyApiGuards,
  jsonError,
  requireSession,
} from "@/lib/security/api-guard";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { canCustomizeProfile } from "@/lib/profile/plan-profile-access";
import {
  deleteByPublicUrl,
  deleteUserBannerVariants,
  storeUserBanner,
  versionedPublicPath,
} from "@/lib/storage";

const MAX_BANNER_BYTES = 1_024_000;
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-banner-upload",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { plan: true, nickname: true, profileBannerUrl: true },
  });
  if (!user) return jsonError(404, "Usuário não encontrado.");
  if (!canCustomizeProfile(user.plan)) {
    return jsonError(403, "Banner exclusivo para assinantes Elite.");
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError(400, "Arquivo inválido.");
  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError(400, "Use PNG, JPEG ou WebP para o banner.");
  }
  if (file.size > MAX_BANNER_BYTES) {
    return jsonError(400, "Banner muito grande (máx. 1 MB).");
  }

  await deleteByPublicUrl(user.profileBannerUrl);
  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeUserBanner(session!.userId, buffer);

  await prisma.user.update({
    where: { id: session!.userId },
    data: {
      profileBannerUrl: stored.publicPath,
      profileBannerMediaType: "STATIC",
      profileBannerModerationStatus: "APPROVED",
    },
  });

  revalidatePath(`/player/${user.nickname}`);

  return NextResponse.json({
    ok: true,
    url: versionedPublicPath(stored.publicPath),
    moderationStatus: "APPROVED",
  });
}

export async function DELETE(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-banner-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { profileBannerUrl: true, plan: true, nickname: true },
  });
  if (!user) return jsonError(404, "Usuário não encontrado.");
  if (!canCustomizeProfile(user.plan)) {
    return jsonError(403, "Banner exclusivo para assinantes Elite.");
  }

  await deleteByPublicUrl(user.profileBannerUrl);
  await deleteUserBannerVariants(session!.userId);

  await prisma.user.update({
    where: { id: session!.userId },
    data: {
      profileBannerUrl: null,
      profileBannerMediaType: "STATIC",
      profileBannerModerationStatus: "APPROVED",
    },
  });

  revalidatePath(`/player/${user.nickname}`);

  return NextResponse.json({ ok: true });
}
