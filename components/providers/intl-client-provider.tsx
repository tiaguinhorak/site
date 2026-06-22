"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { intlGetMessageFallback, intlOnError } from "@/lib/i18n/intl-fallbacks";

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
      onError={intlOnError}
      getMessageFallback={intlGetMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
