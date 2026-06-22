import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import {
  buildPublishedNewsTranslations,
  resolvePublishedNewsSlug,
} from "@/lib/admin/news-publish";
import { adminNewsUpdateSchema } from "@/lib/admin/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-news-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.newsArticle.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Notícia não encontrada.");

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminNewsUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};

  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.excerpt !== undefined) updateData.excerpt = parsed.data.excerpt;
  if (parsed.data.body !== undefined) updateData.body = parsed.data.body;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.imageAccent !== undefined) updateData.imageAccent = parsed.data.imageAccent;
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
  if (parsed.data.featured !== undefined) updateData.featured = parsed.data.featured;
  if (parsed.data.publishedAt) {
    updateData.publishedAt = new Date(parsed.data.publishedAt);
  }

  if (parsed.data.archived !== undefined) {
    updateData.archivedAt = parsed.data.archived ? new Date() : null;
  }

  const nextTitle = (updateData.title as string | undefined) ?? existing.title;
  const nextExcerpt = (updateData.excerpt as string | undefined) ?? existing.excerpt;
  const nextBody = (updateData.body as string | undefined) ?? existing.body;

  const contentChanged =
    parsed.data.title !== undefined ||
    parsed.data.excerpt !== undefined ||
    parsed.data.body !== undefined;

  if (contentChanged) {
    updateData.translations = await buildPublishedNewsTranslations(
      nextTitle,
      nextExcerpt,
      nextBody,
    );
  }

  if (parsed.data.slug !== undefined || contentChanged) {
    updateData.slug = resolvePublishedNewsSlug(
      parsed.data.slug ?? existing.slug,
      nextTitle,
      existing.id.slice(-8),
    );
  }

  const article = await prisma.newsArticle.update({
    where: { id },
    data: updateData,
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "NEWS_UPDATE",
    targetType: "news",
    targetId: id,
    summary: `Atualizou notícia: ${article.title}`,
  });

  return NextResponse.json({ ok: true, article });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-news-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.newsArticle.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Notícia não encontrada.");

  await prisma.newsArticle.delete({ where: { id } });

  await logAdminAction({
    adminId: admin!.id,
    action: "NEWS_DELETE",
    targetType: "news",
    targetId: id,
    summary: `Removeu notícia: ${existing.title}`,
  });

  return NextResponse.json({ ok: true });
}
