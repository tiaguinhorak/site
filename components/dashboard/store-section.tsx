"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Flame } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { confirmPresets } from "@/lib/confirm-presets";
import { cn } from "@/lib/utils";

type StoreItem = {
  id: string;
  name: string;
  type: string;
  price: string;
  originalPrice?: string;
  badge: string;
  description: string;
  accent: string;
  trending: boolean;
  featured: boolean;
};

export function StoreSection() {
  const [items, setItems] = useState<StoreItem[]>([]);

  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  const featured = items.find((i) => i.featured) ?? items[0];
  const others = items.filter((i) => i.id !== featured?.id);

  if (!featured) {
    return (
      <section className="rounded-card glass p-8 text-center text-muted">
        Nenhum item na loja no momento.
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-card glass-strong p-6 sm:p-8",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br opacity-30 blur-3xl",
            featured.accent,
          )}
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Flame className="h-3.5 w-3.5" />
              {featured.badge}
            </span>
            <p className="mt-4 font-display text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {featured.type}
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold text-foreground sm:text-4xl">
              {featured.name}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              {featured.description}
            </p>
            <div className="mt-4 flex items-baseline gap-3">
              {featured.originalPrice && (
                <span className="text-lg text-muted line-through">
                  {featured.originalPrice}
                </span>
              )}
              <span className="font-display text-3xl font-bold text-foreground">
                {featured.price}
              </span>
            </div>
          </div>
          <ButtonLink
            href="/dashboard/loja"
            variant="primary"
            size="lg"
            className="shrink-0"
            confirm={confirmPresets.purchaseItem(featured.name, featured.price)}
          >
            Comprar agora
          </ButtonLink>
        </div>
      </motion.div>

      {others.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {others.map((item, i) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative overflow-hidden rounded-card glass p-5"
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-25 blur-2xl",
                  item.accent,
                )}
                aria-hidden
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {item.badge}
              </span>
              <h3 className="mt-2 font-display text-xl font-bold text-foreground">
                {item.name}
              </h3>
              <p className="mt-1 text-sm text-muted">{item.description}</p>
              <p className="mt-4 font-display text-xl font-bold text-foreground">
                {item.price}
              </p>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
