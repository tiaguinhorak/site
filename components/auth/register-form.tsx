"use client";

import { SteamIcon } from "@/components/ui/icons";

export function RegisterForm() {
  return (
    <div className="space-y-5">
      <a
        href="/api/auth/steam?mode=register"
        className="relative inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-semibold uppercase tracking-wide glass text-foreground transition-all hover:glow-ring hover:-translate-y-0.5"
      >
        <SteamIcon className="h-5 w-5 text-primary" />
        Criar conta com Steam
      </a>

      <div className="rounded-xl border border-border/70 bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Como funciona</p>
        <ul className="mt-2 list-inside list-disc space-y-1.5 pt-2">
          <li>Autenticação e nick vêm da sua conta Steam.</li>
          <li>Depois você define e-mail, telefone, país e uma senha forte.</li>
          <li>A senha serve para entrar pelo nick quando não puder usar a Steam.</li>
        </ul>
      </div>
    </div>
  );
}
