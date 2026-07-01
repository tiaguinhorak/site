"use client";

import { motion } from "motion/react";
import { ClutchClubeBanner } from "@/components/marketing/clutchclube-banner";

export function ClutchClubeShowcase() {
  return (
    <section className="relative py-12 sm:py-16">
      <div className="layout-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <ClutchClubeBanner />
        </motion.div>
      </div>
    </section>
  );
}
