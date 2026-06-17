import Link from "next/link";
import { Home, LayoutDashboard, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-24">
      <div
        className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[28rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[140px]"
        style={{ background: "var(--glow-1)" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-lg text-center">
        <p className="font-display text-8xl font-bold tracking-tight text-gradient sm:text-9xl">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted sm:text-base">
          O link pode estar quebrado ou a página foi removida. Volte ao início ou
          acesse sua área logada.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" variant="primary" size="lg" className="w-full sm:w-auto">
            <Home className="h-5 w-5" />
            Ir ao início
          </ButtonLink>
          <ButtonLink
            href="/dashboard"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </ButtonLink>
        </div>

        <div className="mt-10 rounded-2xl glass p-5">
          <p className="flex items-center justify-center gap-2 text-sm text-muted">
            <Search className="h-4 w-4 text-primary" />
            Procurando um jogador?
          </p>
          <Link
            href="/ranking"
            className="mt-2 block text-sm font-medium text-primary hover:underline"
          >
            Ver ranking e perfis públicos
          </Link>
        </div>
      </div>
    </div>
  );
}
