import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { RATE_LIMITS } from "@/lib/security/constants";
import { logAdminAction } from "@/lib/admin/audit";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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
  const ext = EXT_MAP[file.type] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const url = `/uploads/${folder}/${filename}`;

  await logAdminAction({
    adminId: admin!.id,
    action: "MEDIA_UPLOAD",
    targetType: "upload",
    summary: `Upload de imagem (${folder})`,
    metadata: { url, size: file.size },
  });

  return NextResponse.json({ ok: true, url });
}
