import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SteamCompleteProfileForm } from "@/components/auth/steam-complete-profile-form";
import { Loader2 } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("completeProfileTitle"),
    description: t("completeProfileDescription"),
  };
}

export default async function CompletarPerfilPage() {
  const t = await getTranslations("authPages");
  return (
    <AuthShell
      eyebrow={t("completarEyebrow")}
      title={t("completarTitle")}
      subtitle={t("completarSubtitle")}
      footer={
        <span className="text-muted">
          {t("completarFooter")}
        </span>
      }
      compact
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        <SteamCompleteProfileForm />
      </Suspense>
    </AuthShell>
  );
}
