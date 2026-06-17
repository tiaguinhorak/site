import { Suspense } from "react";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { ProfileSection } from "@/components/dashboard/profile-section";

export default function PerfilPage() {
  return (
    <DashboardPageShell
      title="Perfil"
      description="Edite suas informações, foto, segurança da conta e autenticação em dois fatores."
    >
      <Suspense
        fallback={
          <div className="rounded-card glass p-8 text-center text-muted">
            Carregando perfil...
          </div>
        }
      >
        <ProfileSection />
      </Suspense>
    </DashboardPageShell>
  );
}
