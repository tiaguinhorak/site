import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { RATE_LIMITS } from "@/lib/security/constants";
import { logAdminAction } from "@/lib/admin/audit";
import { storeAdminUpload } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-upload",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file");
  const folderRaw = formData.get("folder");

  if (!(file instanceof File)) {
    return jsonError(400, "Arquivo inválido.");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError(400, "Formato não suportado. Use JPG, PNG, WebP ou GIF.");
  }

  if (file.size > MAX_BYTES) {
    return jsonError(400, "Arquivo muito grande. Máximo 5 MB.");
  }

  const folder =
    folderRaw === "news" || folderRaw === "store" ? folderRaw : "general";
  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeAdminUpload(folder, buffer, file.type);

  await logAdminAction({
    adminId: admin!.id,
    action: "MEDIA_UPLOAD",
    targetType: "upload",
    summary: `Upload de imagem (${folder})`,
    metadata: { url: stored.publicPath, size: stored.size },
  });

  return NextResponse.json({ ok: true, url: stored.publicPath });
}
