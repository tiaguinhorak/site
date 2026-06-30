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

  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
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

  const filename = `${session!.userId}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(await file.arrayBuffer()));

  try {
    await unlink(path.join(uploadDir, `${session!.userId}.gif`));
  } catch {
    // ignore
  }

  const url = `/uploads/banners/${filename}?v=${Date.now()}`;
  await prisma.user.update({
    where: { id: session!.userId },
    data: {
      profileBannerUrl: `/uploads/banners/${filename}`,
      profileBannerMediaType: "STATIC",
      profileBannerModerationStatus: "APPROVED",
    },
  });

  revalidatePath(`/player/${user.nickname}`);

  return NextResponse.json({ ok: true, url, moderationStatus: "APPROVED" });
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

  if (user.profileBannerUrl?.startsWith("/uploads/banners/")) {
    const filepath = path.join(process.cwd(), "public", user.profileBannerUrl.split("?")[0]!);
    try {
      await unlink(filepath);
    } catch {
      // ignore
    }
  }

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
