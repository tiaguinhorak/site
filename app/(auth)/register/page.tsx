import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Criar conta — clutchclube",
  description: "Crie sua conta gratuita na rede competitiva de CS2 clutchclube.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Comece agora"
      title="Criar conta"
      subtitle="Grátis para sempre. Sem cartão de crédito."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
