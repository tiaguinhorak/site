"use client";

import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type PreviewLocale = "pt-BR" | "en" | "es";

type PreviewContent = {
  title: string;
  excerpt: string;
  body: string;
  category: string;
  imageAccent: string;
  imageUrl: string | null;
  featured: boolean;
  authorNickname?: string | null;
  publishedLabel: string;
};

type NewsPreviewProps = {
  locale: PreviewLocale;
  content: PreviewContent;
  mode?: "card" | "detail";
};

const localeLabels: Record<PreviewLocale, string> = {
  "pt-BR": "Português",
  en: "English",
  es: "Español",
};

export function NewsPreviewLocaleTabs({
  locale,
  onLocaleChange,
}: {
  locale: PreviewLocale;
  onLocaleChange: (locale: PreviewLocale) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(localeLabels) as PreviewLocale[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onLocaleChange(key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
            locale === key
              ? "bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {localeLabels[key]}
        </button>
      ))}
    </div>
  );
}

export function NewsPreviewCard({ locale, content }: NewsPreviewProps) {
  return (
    <article className="overflow-hidden rounded-card border border-border glass">
      <div
        className={cn(
          "relative h-36 overflow-hidden sm:h-44",
          content.featured && "sm:h-52",
        )}
      >
        {content.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={cn("h-full w-full bg-gradient-to-br", content.imageAccent)} />
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          {localeLabels[locale]}
        </span>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <span>{content.category}</span>
          <span className="text-muted">· {content.publishedLabel}</span>
          {content.authorNickname && (
            <span className="normal-case text-muted">· {content.authorNickname}</span>
          )}
        </div>
        <h3 className="mt-2 font-display text-xl font-bold text-foreground line-clamp-2">
          {content.title || "Título da notícia"}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3">
          {content.excerpt || "Resumo da publicação aparecerá aqui."}
        </p>
      </div>
    </article>
  );
}

export function NewsPreviewDetail({ locale, content }: NewsPreviewProps) {
  return (
    <article className="overflow-hidden rounded-card border border-border glass">
      <div className="relative h-44 overflow-hidden sm:h-56">
        {content.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={cn("h-full w-full bg-gradient-to-br", content.imageAccent)} />
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          {localeLabels[locale]}
        </span>
      </div>
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <span>{content.category}</span>
          <span className="text-muted">· {content.publishedLabel}</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
          {content.title || "Título da notícia"}
        </h2>
        {content.authorNickname && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <UserRound className="h-4 w-4 text-primary" />
            {content.authorNickname}
          </div>
        )}
        <p className="mt-4 text-base leading-relaxed text-muted">
          {content.excerpt || "Resumo da publicação."}
        </p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90">
          {(content.body || "Conteúdo completo da notícia.").split("\n").map((line, i) =>
            line.trim() ? (
              <p key={i}>{line}</p>
            ) : (
              <br key={i} />
            ),
          )}
        </div>
      </div>
    </article>
  );
}
