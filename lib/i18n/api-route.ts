import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { getNamespace } from "@/lib/i18n/catalog";
import type ptBR from "@/messages/pt-BR.json";
import { createValidationSchemas } from "@/lib/security/schema-factory";
import { formatZodErrors } from "@/lib/security/schemas";
import { DomainError } from "@/lib/errors/domain";
import { resolveDomainError } from "@/lib/i18n/domain-messages";

export type ApiErrorKey = keyof typeof ptBR.apiErrors;

export function requestLocale(request: NextRequest): Locale {
  const value = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export function apiErr(locale: Locale, key: ApiErrorKey): string {
  const messages = getNamespace(locale, "apiErrors");
  return messages[key] ?? key;
}

export function apiErrFromRequest(request: NextRequest, key: ApiErrorKey): string {
  return apiErr(requestLocale(request), key);
}

export function jsonErrorKey(
  request: NextRequest,
  status: number,
  key: ApiErrorKey,
): NextResponse {
  return NextResponse.json(
    { error: apiErrFromRequest(request, key) },
    { status },
  );
}

export function validationSchemasForRequest(request: NextRequest) {
  const locale = requestLocale(request);
  return createValidationSchemas(getNamespace(locale, "validation"));
}

export function zodErrorResponse(request: NextRequest, error: z.ZodError): NextResponse {
  const schemas = validationSchemasForRequest(request);
  return NextResponse.json(
    {
      error: schemas.firstZodError(error),
      fieldErrors: formatZodErrors(error),
    },
    { status: 400 },
  );
}

export function handleDomainError(
  request: NextRequest,
  err: unknown,
): NextResponse | null {
  if (!(err instanceof DomainError)) return null;
  const locale = requestLocale(request);
  return NextResponse.json(
    { error: resolveDomainError(locale, err) },
    { status: err.status },
  );
}

export function handleApiError(request: NextRequest, err: unknown): NextResponse {
  const domain = handleDomainError(request, err);
  if (domain) return domain;
  const locale = requestLocale(request);
  return NextResponse.json(
    { error: apiErr(locale, "internal") },
    { status: 500 },
  );
}
