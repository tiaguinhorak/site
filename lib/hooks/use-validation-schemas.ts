"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createValidationSchemas } from "@/lib/security/schema-factory";
import type { ValidationMessages } from "@/lib/security/schema-factory";

export function useValidationSchemas() {
  const locale = useLocale();
  const t = useTranslations("validation");

  return useMemo(() => {
    const messages: ValidationMessages = {
      invalidData: t("invalidData"),
      honeypot: t("honeypot"),
      passwordMismatch: t("passwordMismatch"),
      mfaCode: t("mfaCode"),
      password: {
        min8: t("password.min8"),
        max: t("password.max"),
        lowercase: t("password.lowercase"),
        uppercase: t("password.uppercase"),
        digit: t("password.digit"),
        required: t("password.required"),
        currentRequired: t("password.currentRequired"),
        different: t("password.different"),
      },
      email: { invalid: t("email.invalid") },
      nickname: {
        min3: t("nickname.min3"),
        format: t("nickname.format"),
      },
      name: {
        min2: t("name.min2"),
        invalid: t("name.invalid"),
      },
      phone: {
        invalid: t("phone.invalid"),
        required: t("phone.required"),
      },
      country: { invalid: t("country.invalid") },
    };
    return createValidationSchemas(messages);
  }, [locale, t]);
}
