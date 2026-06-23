"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  countries,
  getCountry,
  popularCountryCodes,
  type CountryOption,
} from "@/lib/profile/countries";
import { getCountryDisplayName } from "@/lib/i18n/country-names";
import type { Locale } from "@/lib/i18n";
import {
  buildPhoneValue,
  extractNationalDigits,
  formatNationalNumber,
  getPhonePlaceholder,
  maxNationalDigits,
} from "@/lib/profile/phone";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
  label?: string;
  value: string;
  countryCode: string;
  onChange: (phone: string) => void;
  onCountryChange?: (code: string) => void;
  /** When true, dial code follows `countryCode` only (no second flag dropdown). */
  hideDialPicker?: boolean;
  error?: string;
  hint?: string;
  id?: string;
  autoComplete?: string;
};

function CountryDialDropdown({
  value,
  onChange,
  open,
  onOpenChange,
}: {
  value: string;
  onChange: (code: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("phoneInput");
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = getCountry(value);

  function countryLabel(c: CountryOption) {
    return getCountryDisplayName(c.code, locale);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        countryLabel(c).toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [query, locale]);

  const popular = useMemo(
    () =>
      popularCountryCodes
        .map((code) => getCountry(code))
        .filter((c): c is CountryOption => Boolean(c)),
    [],
  );

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  function pick(country: CountryOption) {
    onChange(country.code);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("countryAria")}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex h-12 items-center gap-1.5 rounded-xl glass-input px-2.5 text-sm text-foreground outline-none transition-all sm:gap-2 sm:px-3",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
        )}
      >
        <span className="text-lg leading-none">{selected?.flag ?? "🌐"}</span>
        <span className="font-mono text-xs sm:text-sm">{selected?.dial ?? "+55"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-2 w-[min(100vw-2rem,320px)] overflow-hidden rounded-xl border border-border glass-menu shadow-xl"
          role="listbox"
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                className="h-10 w-full rounded-lg glass-input pl-9 pr-3 text-sm outline-none focus:border-primary"
                autoFocus
              />
            </div>
          </div>

          {!query.trim() && (
            <div className="border-b border-border p-2">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {t("popular")}
              </p>
              <ul className="flex flex-wrap gap-1">
                {popular.map((country) => (
                  <li key={`popular-${country.code}`}>
                    <button
                      type="button"
                      onClick={() => pick(country)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg glass-chip px-2 py-1 text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
                        country.code === value &&
                          "border-primary/40 bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
                      )}
                    >
                      <span>{country.flag}</span>
                      <span className="font-mono">{country.dial}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="max-h-56 overflow-y-auto p-1">
            {filtered.map((country) => (
              <li key={country.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={country.code === value}
                  onClick={() => pick(country)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
                    country.code === value &&
                      "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
                  )}
                >
                  <span className="text-lg leading-none">{country.flag}</span>
                  <span className="min-w-0 flex-1 truncate">{countryLabel(country)}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {country.dial}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {t("noResults")}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PhoneInput({
  label,
  value,
  countryCode,
  onChange,
  onCountryChange,
  hideDialPicker = false,
  error,
  hint,
  id = "phone-input",
  autoComplete = "tel-national",
}: PhoneInputProps) {
  const t = useTranslations("phoneInput");
  const resolvedLabel = label ?? t("label");
  const [dialOpen, setDialOpen] = useState(false);
  const nationalDigits = extractNationalDigits(value, countryCode);
  const displayValue = formatNationalNumber(nationalDigits, countryCode);
  const errorId = error ? `${id}-error` : undefined;
  const selected = getCountry(countryCode);

  function updatePhone(nextCountry: string, nextNational: string) {
    onChange(buildPhoneValue(nextNational, nextCountry));
  }

  function handleCountryChange(code: string) {
    onCountryChange?.(code);
    updatePhone(code, nationalDigits);
  }

  function handleNumberChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, maxNationalDigits(countryCode));
    updatePhone(countryCode, digits);
  }

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block font-display text-xs font-semibold uppercase tracking-wider text-muted"
      >
        {resolvedLabel}
      </label>

      <div
        className={cn(
          "flex gap-2",
          error && "[&_button]:border-rose-500/60 [&_input]:border-rose-500/60",
        )}
      >
        {hideDialPicker ? (
          <span
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl glass-input px-3 font-mono text-sm text-muted"
            aria-hidden
          >
            <span className="text-lg leading-none">{selected?.flag ?? "🌐"}</span>
            <span>{selected?.dial ?? "+55"}</span>
          </span>
        ) : (
          <CountryDialDropdown
            value={countryCode}
            onChange={handleCountryChange}
            open={dialOpen}
            onOpenChange={setDialOpen}
          />
        )}

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          value={displayValue}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={getPhonePlaceholder(countryCode)}
          className={cn(
            "h-12 min-w-0 flex-1 rounded-xl glass-input px-4 font-mono text-sm text-foreground placeholder:text-muted/60 transition-all duration-200 outline-none",
            "focus:border-primary focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
            error && "focus:border-rose-500",
          )}
        />
      </div>

      {hint && !error && (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
