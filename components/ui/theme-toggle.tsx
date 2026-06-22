"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Alternar tema claro e escuro"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "glass relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-foreground transition-colors hover:glow-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {mounted && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ y: -16, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 16, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inline-flex"
          >
            {isDark ? (
              <Moon className="h-5 w-5 text-primary-soft" />
            ) : (
              <Sun className="h-5 w-5 text-primary" />
            )}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  );
}
