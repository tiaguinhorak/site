"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { intlGetMessageFallback, intlOnError } from "@/lib/i18n/intl-fallbacks";
import { defaultTimeZone } from "@/lib/i18n";

type IntlClientProviderProps = {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
};

export function IntlClientProvider({
  locale,
  messages,
  children,
}: IntlClientProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={defaultTimeZone}
      onError={intlOnError}
      getMessageFallback={intlGetMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
