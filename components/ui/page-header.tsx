"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  className?: string;
  size?: "default" | "lg";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  size = "default",
}: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("relative", className)}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] px-3 py-1 font-display text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          {eyebrow}
        </span>
      )}
      <h1
        className={cn(
          "mt-4 font-display font-bold leading-tight tracking-tight text-foreground",
          size === "lg"
            ? "text-4xl sm:text-5xl md:text-6xl"
            : "text-3xl sm:text-4xl",
        )}
      >
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </p>
      )}
    </motion.header>
  );
}
