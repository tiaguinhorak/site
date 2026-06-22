"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Article = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  date: string;
  imageAccent: string;
  imageUrl?: string;
  authorNickname: string | null;
  authorAvatarUrl: string | null;
};

type Props = {
  slug: string;
};

export function NewsArticleDetail({ slug }: Props) {
  const locale = useLocale();
  const t = useTranslations("newsDetail");
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    fetch(`/api/news/${encodeURIComponent(slug)}`, { credentials: "same-origin" })
      .then((r) => {
        if (r.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.article) {
          setArticle(data.article);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="rounded-card glass-strong p-8 text-center">
        <p className="text-muted">{t("notFound")}</p>
        <Link
          href="/dashboard/noticias"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-card glass-strong">
      <div className="relative h-40 sm:h-52 md:h-64 overflow-hidden">
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={cn("h-full w-full bg-gradient-to-br", article.imageAccent)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--background)_85%,transparent)] to-transparent" />
      </div>

      <div className="p-6 sm:p-8 md:p-10">
        <Link
          href="/dashboard/noticias"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <span>{article.category}</span>
          <span className="text-muted">· {article.date}</span>
        </div>

        <h1 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="mt-3 text-base text-muted sm:text-lg">{article.excerpt}</p>
        )}

        {article.authorNickname && (
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] text-white">
              {article.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.authorAvatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted">{t("author")}</p>
              <p className="text-sm font-semibold text-foreground">
                {article.authorNickname}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-border pt-8">
          {article.body ? (
            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground/90 sm:text-base">
              {article.body.split(/\n\n+/).map((paragraph, i) => (
                <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{t("noBody")}</p>
          )}
        </div>
      </div>
    </article>
  );
}
