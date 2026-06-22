"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Info,
  LogOut,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmTone = "danger" | "warning" | "default";
export type ConfirmIcon = "delete" | "edit" | "logout" | "info";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: ConfirmIcon;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const toneConfig: Record<
  ConfirmTone,
  { icon: LucideIcon; iconClass: string; confirmVariant: "primary" | "outline" }
> = {
  danger: {
    icon: LogOut,
    iconClass: "bg-rose-500/15 text-rose-400",
    confirmVariant: "primary",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "bg-amber-500/15 text-amber-400",
    confirmVariant: "primary",
  },
  default: {
    icon: Info,
    iconClass: "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-primary",
    confirmVariant: "primary",
  },
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("confirmDialog");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setOpen(false);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    if (resolve) resolve(result);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const tone = options?.tone ?? "default";
  const config = toneConfig[tone];
  const iconKey = options?.icon;
  const Icon =
    iconKey === "delete"
      ? Trash2
      : iconKey === "edit"
        ? Pencil
        : iconKey === "logout"
          ? LogOut
          : config.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <AnimatePresence>
        {open && options && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6">
            <motion.button
              type="button"
              aria-label={t("close")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 scrim-dim"
              onClick={() => close(false)}
            />

            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-description"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="relative z-[101] w-full max-w-md overflow-hidden rounded-2xl glass-modal p-6 shadow-2xl"
            >
              <div className="flex gap-4">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    tone === "danger"
                      ? "bg-rose-500/15 text-rose-400"
                      : config.iconClass,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="confirm-title"
                    className="font-display text-lg font-bold text-foreground"
                  >
                    {options.title}
                  </h2>
                  {options.description && (
                    <p
                      id="confirm-description"
                      className="mt-2 text-sm leading-relaxed text-muted"
                    >
                      {options.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => close(false)}
                >
                  {options.cancelLabel ?? t("cancel")}
                </Button>
                <Button
                  type="button"
                  variant={config.confirmVariant}
                  size="md"
                  className={cn(
                    "w-full sm:w-auto",
                    tone === "danger" &&
                      "bg-rose-600 hover:shadow-[0_8px_30px_-8px_rgba(244,63,94,0.5)]",
                  )}
                  onClick={() => close(true)}
                >
                  {options.confirmLabel ?? t("confirm")}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
