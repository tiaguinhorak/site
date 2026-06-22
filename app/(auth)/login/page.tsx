import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("loginTitle"),
    description: t("loginDescription"),
  };
}

export default async function LoginPage() {
  const t = await getTranslations("authPages");
  return (
    <AuthShell
      eyebrow={t("loginEyebrow")}
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("loginNoAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            {t("loginCreate")}
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
