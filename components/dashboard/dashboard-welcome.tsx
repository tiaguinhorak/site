"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useUser } from "@/lib/hooks/use-user";

export function DashboardWelcome() {
  const { user } = useUser();
  const t = useTranslations("dashboardWelcome");

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {t("greeting", { name: user.nickname })}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {t("subtitle", { rank: user.rank, elo: user.elo })}
      </p>
    </motion.div>
  );
}
