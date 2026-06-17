"use client";

import { motion } from "motion/react";
import { ShieldCheck, LayoutDashboard } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SteamIcon } from "@/components/ui/icons";
import { confirmPresets } from "@/lib/confirm-presets";
import { useAuthSession } from "@/lib/hooks/use-auth-session";

export function CallToAction() {
  const { authenticated, steamLinked } = useAuthSession();

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] glass-strong px-6 py-16 text-center sm:px-12 sm:py-20"
        >
          <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[44rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[120px]"
            style={{ background: "var(--glow-1)" }}
            aria-hidden
          />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
              Mais que servidores.
              <span className="block text-gradient">Sua evolução no CS2.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
              {authenticated
                ? steamLinked
                  ? "Acesse o dashboard para conectar aos servidores, ver seu ranking e gerenciar sua conta."
                  : "Vincule sua Steam para jogar nos servidores e liberar skins, ranking e inventário."
                : "Crie sua conta gratuita, instale o anticheat e entre no melhor servidor disponível em segundos."}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {authenticated ? (
                steamLinked ? (
                  <ButtonLink href="/dashboard" variant="primary" size="lg" className="w-full sm:w-auto">
                    <LayoutDashboard className="h-5 w-5" />
                    Ir ao Dashboard
                  </ButtonLink>
                ) : (
                  <ButtonLink
                    href="/api/auth/steam?mode=link"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <SteamIcon className="h-5 w-5" />
                    Vincular Steam
                  </ButtonLink>
                )
              ) : (
                <ButtonLink href="/register" variant="primary" size="lg" className="w-full sm:w-auto">
                  <SteamIcon className="h-5 w-5" />
                  Criar conta grátis
                </ButtonLink>
              )}
              <ButtonLink
                href="/anticheat"
                variant="glass"
                size="lg"
                className="w-full sm:w-auto"
                confirm={confirmPresets.downloadAnticheat}
              >
                <ShieldCheck className="h-5 w-5 text-primary" />
                Baixar Anticheat
              </ButtonLink>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
