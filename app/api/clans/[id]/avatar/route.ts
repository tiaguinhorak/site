import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { updateClanAvatar, ClanError } from "@/lib/clans/service";
import { prisma } from "@/lib/prisma";
import { deleteByPublicUrl, storeClanAvatar, versionedPublicPath } from "@/lib/storage";

const MAX_BYTES = 512_000;
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "clan-avatar-upload",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const { id } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError(400, "Arquivo inválido.");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError(400, "Formato não suportado. Use PNG, JPG ou WebP.");
  }
  if (file.size > MAX_BYTES) {
    return jsonError(400, "Arquivo muito grande (máx. 512 KB).");
  }

  const existing = await prisma.clan.findUnique({
    where: { id },
    select: { avatarUrl: true },
  });
  await deleteByPublicUrl(existing?.avatarUrl);

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeClanAvatar(id, buffer);

  try {
    const clan = await updateClanAvatar(session!.userId, id, stored.publicPath);
    return NextResponse.json({
      ok: true,
      url: versionedPublicPath(stored.publicPath),
      clan,
    });
  } catch (err) {
    if (err instanceof ClanError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao atualizar foto do clã." }, { status: 500 });
  }
}
