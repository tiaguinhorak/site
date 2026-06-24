"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/lib/theme";

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme}
      position="top-right"
      richColors
      closeButton
      expand={false}
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "glass-strong border border-border shadow-lg font-[family-name:var(--font-manrope)]",
          title: "text-foreground",
          description: "text-muted",
          closeButton: "border-border bg-transparent text-muted hover:text-foreground",
        },
      }}
    />
  );
}
