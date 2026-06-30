import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { getNewsArticles } from "@/lib/queries";
import { parseArticleTranslations } from "@/lib/i18n-content";
import { resolveArticleForLocale } from "@/lib/i18n/auto-resolve-content";
import { formatNewsCategory } from "@/lib/i18n/news-category";
import { prisma } from "@/lib/prisma";

async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  return isLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(
    locale === "pt-BR" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US",
    { day: "2-digit", month: "short", year: "numeric" },
  );
}

export async function GET() {
  const locale = await getLocale();
  const articles = await getNewsArticles();

  const resolved = await Promise.all(
    articles.map(async (a) => {
      const storedTranslations = parseArticleTranslations(a.translations);
      const fields = await resolveArticleForLocale(
        locale,
        a.title,
        a.excerpt,
        a.body ?? "",
        storedTranslations,
      );

      if (fields.translated && fields.translations) {
        await prisma.newsArticle.update({
          where: { id: a.id },
          data: { translations: fields.translations },
        });
      }

      return {
        id: a.id,
        slug: a.slug,
        title: fields.title,
        excerpt: fields.excerpt,
        category: formatNewsCategory(a.category, locale),
        date: formatDate(a.publishedAt, locale),
        imageAccent: a.imageAccent,
        imageUrl: a.imageUrl ?? undefined,
        featured: a.featured,
        authorNickname: a.author?.nickname ?? null,
      };
    }),
  );

  return NextResponse.json({ articles: resolved });
}
