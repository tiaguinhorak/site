"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { getNamespace, resolveLocale } from "@/lib/i18n/catalog";
import { createValidationSchemas } from "@/lib/security/schema-factory";
import { formatZodErrors } from "@/lib/security/schemas";

export function useValidationSchemas() {
  const locale = resolveLocale(useLocale());

  return useMemo(
    () => createValidationSchemas(getNamespace(locale, "validation")),
    [locale],
  );
}

export function useZodFieldHelpers() {
  const { firstZodError } = useValidationSchemas();
  return { formatZodErrors, firstZodError };
}
