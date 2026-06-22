import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { getNamespace } from "@/lib/i18n/catalog";
import { createValidationSchemas } from "@/lib/security/schema-factory";
import type ptBR from "@/messages/pt-BR.json";

export type ApiErrorKey = keyof typeof ptBR.apiErrors;

export async function getRequestLocale(request?: NextRequest): Promise<Locale> {
  if (request) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(cookieLocale)) return cookieLocale;
  }
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  return isLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

export function apiErrorMessage(locale: Locale, key: ApiErrorKey): string {
  const messages = getNamespace(locale, "apiErrors");
  return messages[key] ?? key;
}

export async function getApiError(
  key: ApiErrorKey,
  request?: NextRequest,
): Promise<string> {
  const locale = await getRequestLocale(request);
  return apiErrorMessage(locale, key);
}

export function getValidationMessages(locale: Locale) {
  return getNamespace(locale, "validation");
}

export function createServerValidationSchemas(locale: Locale) {
  return createValidationSchemas(getValidationMessages(locale));
}
