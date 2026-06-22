import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
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
import { adminNewsCreateSchema } from "@/lib/admin/schemas";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const status = request.nextUrl.searchParams.get("status");
  const where =
    status === "archived"
      ? { archivedAt: { not: null } }
      : status === "all"
        ? {}
        : { archivedAt: null };

  const articles = await prisma.newsArticle.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    include: { author: { select: { nickname: true } } },
  });
  return NextResponse.json({ articles });
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-news-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminNewsCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const slug = resolvePublishedNewsSlug(
    parsed.data.slug,
    parsed.data.title,
    crypto.randomUUID().slice(0, 8),
  );

  const translations = await buildPublishedNewsTranslations(
    parsed.data.title,
    parsed.data.excerpt,
    parsed.data.body ?? "",
  );

  const article = await prisma.newsArticle.create({
    data: {
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      body: parsed.data.body ?? "",
      slug,
      category: parsed.data.category,
      imageAccent: parsed.data.imageAccent,
      imageUrl: parsed.data.imageUrl,
      featured: parsed.data.featured,
      translations,
      authorId: admin!.id,
      publishedAt: parsed.data.publishedAt
        ? new Date(parsed.data.publishedAt)
        : new Date(),
    },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "NEWS_CREATE",
    targetType: "news",
    targetId: article.id,
    summary: `Criou notícia: ${article.title}`,
  });

  return NextResponse.json({ ok: true, article });
}
