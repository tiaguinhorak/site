"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type NewsArticle = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  imageAccent: string;
  imageUrl?: string;
  featured?: boolean;
};

export function NewsSection() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => setArticles(data.articles ?? []))
      .catch(() => setArticles([]));
  }, []);

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {articles.map((article, i) => (
        <motion.article
          key={article.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          className={cn(
            "overflow-hidden rounded-card glass",
            article.featured && "lg:col-span-2",
          )}
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
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={cn("h-full w-full bg-gradient-to-br", article.imageAccent)}
              />
            )}
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <span>{article.category}</span>
              <span className="text-muted">· {article.date}</span>
            </div>
            <h3 className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl">
              {article.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {article.excerpt}
            </p>
          </div>
        </motion.article>
      ))}
      {articles.length === 0 && (
        <p className="text-center text-muted py-12">Sem notícias publicadas.</p>
      )}
    </section>
  );
}
