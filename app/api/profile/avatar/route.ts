import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { avatarSourceSchema, firstZodError } from "@/lib/security/schemas";
import { jsonErrorKey } from "@/lib/i18n/api-route";
import { serializeUser } from "@/lib/serializers";

const MAX_AVATAR_BYTES = 512_000;
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-avatar-upload",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonErrorKey(request, 400, "invalidFile");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonErrorKey(request, 400, "avatarFormatUnsupported");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return jsonErrorKey(request, 400, "avatarTooLarge");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${session!.userId}.webp`;
  const filepath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const url = `/uploads/avatars/${filename}?v=${Date.now()}`;

  const user = await prisma.user.update({
    where: { id: session!.userId },
    data: {
      avatarUrl: `/uploads/avatars/${filename}`,
      avatarPreset: null,
    },
  });

  return NextResponse.json({ ok: true, url, user: serializeUser(user) });
}

export async function PATCH(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-avatar-source",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = avatarSourceSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error) },
      { status: 400 },
    );
  }

  if (parsed.data.source === "steam") {
    const user = await prisma.user.update({
      where: { id: session!.userId },
      data: { avatarUrl: null, avatarPreset: null },
    });
    return NextResponse.json({ ok: true, user: serializeUser(user) });
  }

  const user = await prisma.user.update({
    where: { id: session!.userId },
    data: {
      avatarPreset: parsed.data.presetId,
      avatarUrl: null,
    },
  });

  return NextResponse.json({ ok: true, user: serializeUser(user) });
}

export async function DELETE(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-avatar-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const filepath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "avatars",
    `${session!.userId}.webp`,
  );

  try {
    await unlink(filepath);
  } catch {
    // file may not exist
  }

  const user = await prisma.user.update({
    where: { id: session!.userId },
    data: { avatarUrl: null, avatarPreset: null },
  });

  return NextResponse.json({ ok: true, user: serializeUser(user) });
}
