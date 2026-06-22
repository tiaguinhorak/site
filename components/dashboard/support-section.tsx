"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { supportChannels } from "@/lib/support-channels";
import { cn } from "@/lib/utils";

export function SupportSection() {
  const [channels] = useState(supportChannels);
  const t = useTranslations("support");

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {channels.map((channel, i) => {
        const Icon = channel.icon;
        return (
          <motion.article
            key={channel.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative overflow-hidden rounded-card glass p-5 sm:p-6"
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl",
                channel.accent,
              )}
              aria-hidden
            />
            <div className="relative">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                  channel.accent,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                {t(`${channel.id}Title`)}
              </h3>
              <p className="mt-2 text-sm text-muted">{t(`${channel.id}Desc`)}</p>
              <a
                href={channel.href}
                className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
                onClick={(e) => {
                  if (channel.href.startsWith("http")) return;
                  e.preventDefault();
                }}
              >
                {t(`${channel.id}Action`)}
              </a>
            </div>
          </motion.article>
        );
      })}
    </section>
  );
}
