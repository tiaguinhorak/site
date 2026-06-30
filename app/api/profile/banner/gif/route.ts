import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
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
import { validateBannerGifBuffer } from "@/lib/profile/gif-banner";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-banner-gif",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { plan: true, isAdmin: true, nickname: true, profileBannerUrl: true },
  });
  if (!user) return jsonError(404, "Usuário não encontrado.");
  if (!canCustomizeProfile(user.plan)) {
    return jsonError(403, "Banner animado exclusivo para assinantes Elite.");
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError(400, "Arquivo inválido.");
  if (file.type !== "image/gif") {
    return jsonError(400, "Envie um arquivo GIF animado.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateBannerGifBuffer(buffer);
  if (!validation.ok) {
    return jsonError(400, validation.error);
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "banners");
  await mkdir(uploadDir, { recursive: true });

  if (user.profileBannerUrl?.startsWith("/uploads/banners/")) {
    const oldPath = path.join(
      process.cwd(),
      "public",
      user.profileBannerUrl.split("?")[0]!,
    );
    try {
      await unlink(oldPath);
    } catch {
      // ignore
    }
  }

  const filename = `${session!.userId}.gif`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  for (const ext of ["webp", "png", "jpg", "jpeg"]) {
    try {
      await unlink(path.join(uploadDir, `${session!.userId}.${ext}`));
    } catch {
      // ignore
    }
  }

  const moderationStatus = user.isAdmin ? "APPROVED" : "PENDING";

  await prisma.user.update({
    where: { id: session!.userId },
    data: {
      profileBannerUrl: `/uploads/banners/${filename}`,
      profileBannerMediaType: "GIF",
      profileBannerModerationStatus: moderationStatus,
    },
  });

  revalidatePath(`/player/${user.nickname}`);

  return NextResponse.json({
    ok: true,
    url: `/uploads/banners/${filename}?v=${Date.now()}`,
    moderationStatus,
    message: user.isAdmin
      ? "Banner GIF enviado e aprovado automaticamente (conta admin)."
      : "Banner GIF enviado para moderação.",
  });
}
