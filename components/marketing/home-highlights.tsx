"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Gamepad2,
  Server,
  Trophy,
  Crown,
  Layers,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { marketingPages } from "@/lib/navigation";

const icons = {
  "/modos": Gamepad2,
  "/plataforma": Layers,
  "/servidores": Server,
  "/ranking": Trophy,
  "/premium": Crown,
  "/anticheat": ShieldCheck,
};

export function HomeHighlights() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Explore a{" "}
            <span className="text-gradient">plataforma completa</span>
          </h2>
          <p className="mt-3 text-base text-muted sm:text-lg">
            Tudo separado e organizado — modos, servidores, ranking, planos e
            muito mais.
          </p>
        </div>

        <div className="mt-10 grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {marketingPages.map((page, i) => {
            const Icon = icons[page.href as keyof typeof icons] ?? Gamepad2;
            return (
              <motion.div
                key={page.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
              >
                <Link
                  href={page.href}
                  className="group flex h-full min-w-0 flex-col rounded-card glass p-6 transition-all hover:glow-ring-contained hover:-translate-y-1 sm:p-7"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 font-display text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {page.eyebrow}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                    {page.label}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {page.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                    Ver página
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
