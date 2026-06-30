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
import { validateGifBuffer } from "@/lib/profile/gif-avatar";
import { storeUserAvatarGif, versionedPublicPath } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-gif-avatar",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { plan: true, isAdmin: true, nickname: true },
  });
  if (!user) return jsonError(404, "Usuário não encontrado.");
  if (!canCustomizeProfile(user.plan)) {
    return jsonError(403, "Avatar GIF exclusivo para assinantes Elite.");
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError(400, "Arquivo inválido.");
  if (file.type !== "image/gif") {
    return jsonError(400, "Envie um arquivo GIF animado.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateGifBuffer(buffer);
  if (!validation.ok) {
    return jsonError(400, validation.error);
  }

  const stored = await storeUserAvatarGif(session!.userId, buffer);
  const moderationStatus = user.isAdmin ? "APPROVED" : "PENDING";

  await prisma.user.update({
    where: { id: session!.userId },
    data: {
      avatarUrl: stored.publicPath,
      avatarPreset: null,
      avatarMediaType: "GIF",
      avatarModerationStatus: moderationStatus,
    },
  });

  revalidatePath(`/player/${user.nickname}`);

  return NextResponse.json({
    ok: true,
    url: versionedPublicPath(stored.publicPath),
    moderationStatus,
    message: user.isAdmin
      ? "GIF enviado e aprovado automaticamente (conta admin)."
      : "GIF enviado para moderação. Conteúdo impróprio resulta em banimento permanente.",
  });
}
