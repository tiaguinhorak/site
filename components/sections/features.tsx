"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/reveal";
import { AmbientGlow } from "@/components/ui/ambient";
import { resolveIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

export type FeatureView = {
  index: string;
  title: string;
  description: string;
  iconKey: string;
};

export function Features({
  embedded = false,
  features,
}: {
  embedded?: boolean;
  features: FeatureView[];
}) {
  const t = useTranslations("marketing");
  return (
    <section
      id={embedded ? undefined : "plataforma"}
      className={cn(
        "relative overflow-hidden",
        embedded ? "" : "scroll-mt-24 py-24",
      )}
    >
      {!embedded && <AmbientGlow />}
      <div className={cn(embedded ? "" : "layout-container relative")}>
        {!embedded && (
          <SectionHeading
            eyebrow={t("plataformaEyebrow")}
            title={
              <>
                {t("plataformaTitleA")}{" "}
                <span className="text-gradient">{t("plataformaTitleB")}</span>
              </>
            }
            description={t("plataformaDesc")}
            align="center"
          />
        )}

        <div
          className={cn(
            "grid w-full min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3",
            !embedded && "mt-14",
          )}
        >
          {features.map((feature, i) => {
            const Icon = resolveIcon(feature.iconKey);
            return (
              <motion.div
                key={feature.index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className="group relative overflow-hidden rounded-card glass p-6 transition-all duration-300 hover:glow-ring-contained sm:p-7"
              >
                <span className="absolute right-6 top-5 font-display text-5xl font-bold text-[color-mix(in_srgb,var(--primary)_14%,transparent)] transition-colors duration-300 group-hover:text-[color-mix(in_srgb,var(--primary)_28%,transparent)]">
                  {feature.index}
                </span>
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
