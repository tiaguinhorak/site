import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar — clutchclube",
  description: "Acesse sua conta clutchclube e entre no melhor servidor de CS2.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entrar na conta"
      subtitle="Conecte-se para acompanhar seu ranking e jogar."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Criar conta grátis
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
