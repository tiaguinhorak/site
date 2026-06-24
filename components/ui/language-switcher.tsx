"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import {
  LOCALE_COOKIE,
  localeLabels,
  localeFlags,
  locales,
  type Locale,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  try {
    window.localStorage.setItem(LOCALE_COOKIE, locale);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

type Props = {
  variant?: "menu" | "inline" | "stacked";
  className?: string;
};

export function LanguageSwitcher({ variant = "menu", className }: Props) {
  const router = useRouter();
  const active = useLocale() as Locale;
  const t = useTranslations("navbar");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  function choose(locale: Locale) {
    if (pending || locale === active) return;
    setOpen(false);
    persistLocale(locale);
    startTransition(() => router.refresh());
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "relative inline-flex rounded-xl glass p-1",
          pending && "pointer-events-none opacity-70",
          className,
        )}
      >
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            disabled={pending}
            aria-label={localeLabels[locale]}
            title={localeLabels[locale]}
            onClick={() => choose(locale)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed",
              locale === active
                ? "bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            <span className="text-base leading-none" aria-hidden>{localeFlags[locale]}</span>
            <span className="text-xs font-bold">{localeLabels[locale]}</span>
          </button>
        ))}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--background)_60%,transparent)]">
            <Loader2 className="h-4 w-4 motion-safe-spin text-primary" aria-hidden />
            <span className="sr-only">{tCommon("loading")}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={cn(
          "relative grid gap-1 rounded-xl glass p-1",
          pending && "pointer-events-none opacity-70",
          className,
        )}
      >
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            disabled={pending}
            aria-label={localeLabels[locale]}
            onClick={() => choose(locale)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed",
              locale === active
                ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground"
                : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-foreground",
            )}
          >
            <span className="text-lg leading-none" aria-hidden>{localeFlags[locale]}</span>
            <span className="flex-1 text-left font-medium">{localeLabels[locale]}</span>
            {locale === active && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>
        ))}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--background)_60%,transparent)]">
            <Loader2 className="h-4 w-4 motion-safe-spin text-primary" aria-hidden />
            <span className="sr-only">{tCommon("loading")}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={t("language")}
        disabled={pending}
        onClick={() => !pending && setOpen((v) => !v)}
        className={cn(
          "glass inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm text-foreground transition-colors hover:glow-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
        )}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 motion-safe-spin text-primary" />
        ) : (
          <span className="text-lg leading-none" aria-hidden>{localeFlags[active]}</span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && !pending && "rotate-180",
          )}
        />
      </button>
      {open && !pending && (
        <div
          className="absolute right-0 z-[200] mt-2 w-52 overflow-hidden rounded-xl border border-border glass-strong p-1 shadow-2xl"
        >
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              disabled={pending}
              onClick={() => choose(locale)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed",
                locale === active
                  ? "text-foreground"
                  : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
              )}
            >
              <span className="text-lg leading-none" aria-hidden>{localeFlags[locale]}</span>
              <span className="flex-1 text-left font-medium">{localeLabels[locale]}</span>
              {locale === active && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
