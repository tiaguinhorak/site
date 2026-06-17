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
import { adminNewsCreateSchema } from "@/lib/admin/schemas";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const articles = await prisma.newsArticle.findMany({
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json({ articles });
}

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
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

  const article = await prisma.newsArticle.create({
    data: {
      ...parsed.data,
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
