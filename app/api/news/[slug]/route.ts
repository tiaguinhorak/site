import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  parseArticleTranslations,
} from "@/lib/i18n-content";
import { resolveArticleForLocale } from "@/lib/i18n/auto-resolve-content";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { formatNewsCategory } from "@/lib/i18n/news-category";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  return isLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(
    locale === "pt-BR" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US",
    { day: "2-digit", month: "long", year: "numeric" },
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const locale = await getLocale();

  const article = await prisma.newsArticle.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          nickname: true,
          avatarUrl: true,
          avatarPreset: true,
          steamAvatarUrl: true,
        },
      },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const storedTranslations = parseArticleTranslations(article.translations);
  const resolved = await resolveArticleForLocale(
    locale,
    article.title,
    article.excerpt,
    article.body,
    storedTranslations,
  );

  if (resolved.translated && resolved.translations) {
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: { translations: resolved.translations },
    });
  }

  return NextResponse.json({
    article: {
      id: article.id,
      slug: article.slug,
      title: resolved.title,
      excerpt: resolved.excerpt,
      body: resolved.body,
      category: formatNewsCategory(article.category, locale),
      date: formatDate(article.publishedAt, locale),
      imageAccent: article.imageAccent,
      imageUrl: article.imageUrl ?? undefined,
      featured: article.featured,
      authorNickname: article.author?.nickname ?? null,
      authorAvatarUrl: article.author
        ? resolveUserAvatarUrl(article.author)
        : null,
      publishedAt: article.publishedAt.toISOString(),
    },
  });
}
