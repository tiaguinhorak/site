import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SteamCompleteProfileForm } from "@/components/auth/steam-complete-profile-form";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Completar perfil — clutchclube",
  description: "Finalize seu cadastro clutchclube após conectar com Steam.",
};

export default function CompletarPerfilPage() {
  return (
    <AuthShell
      eyebrow="Último passo"
      title="Complete seu perfil"
      subtitle="Sua Steam foi conectada. Preencha os dados abaixo — o progresso é salvo automaticamente."
      footer={
        <span className="text-muted">
          Você pode trocar a Steam ou usar outra conta antes de finalizar
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
