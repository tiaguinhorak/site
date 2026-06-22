"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  imageAccent: string;
  imageUrl?: string;
  featured?: boolean;
  authorNickname?: string | null;
};

export function NewsSection() {
  const locale = useLocale();
  const t = useTranslations("news");
  const [articles, setArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/news", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setArticles(data.articles ?? []);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {articles.map((article, i) => (
        <motion.article
          key={article.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          className={cn(
            "overflow-hidden rounded-card glass transition-colors hover:glow-ring-contained",
            article.featured && "lg:col-span-2",
          )}
        >
          <Link
            href={`/dashboard/noticias/${article.slug}`}
            className="group block"
          >
            <div
              className={cn(
                "relative h-32 overflow-hidden sm:h-40",
                article.featured && "sm:h-48",
              )}
            >
              {article.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div
                  className={cn("h-full w-full bg-gradient-to-br", article.imageAccent)}
                />
              )}
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <span>{article.category}</span>
                <span className="text-muted">· {article.date}</span>
                {article.authorNickname && (
                  <span className="normal-case text-muted">
                    · {article.authorNickname}
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl group-hover:text-primary transition-colors">
                {article.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3">
                {article.excerpt}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {t("readMore")}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </motion.article>
      ))}
      {articles.length === 0 && (
        <p className="text-center text-muted py-12">{t("empty")}</p>
      )}
    </section>
  );
}
