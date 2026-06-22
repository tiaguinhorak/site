import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("registerTitle"),
    description: t("registerDescription"),
  };
}

export default async function RegisterPage() {
  const t = await getTranslations("authPages");
  return (
    <AuthShell
      eyebrow={t("registerEyebrow")}
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("registerHaveAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            {t("registerSignIn")}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
