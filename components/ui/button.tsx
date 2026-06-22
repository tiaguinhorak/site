"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import {
  useConfirm,
  type ConfirmOptions,
} from "@/components/providers/confirm-provider";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "glass";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-display font-semibold tracking-wide uppercase whitespace-nowrap rounded-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary:
    "text-primary-foreground bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] shadow-[0_8px_30px_-8px_var(--glow-1)] hover:shadow-[0_10px_44px_-8px_var(--glow-1)] hover:-translate-y-0.5 active:translate-y-0",
  outline:
    "glass-input text-foreground hover:glow-ring-contained hover:-translate-y-0.5 active:translate-y-0",
  ghost:
    "text-muted hover:text-foreground hover:glass-chip",
  glass:
    "glass text-foreground hover:glow-ring hover:-translate-y-0.5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-sm",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  confirm?: ConfirmOptions;
};

async function runWithConfirm(
  confirmOpts: ConfirmOptions | undefined,
  requestConfirm: (opts: ConfirmOptions) => Promise<boolean>,
  action: () => void,
  e?: MouseEvent,
) {
  if (confirmOpts) {
    if (e) e.preventDefault();
    const ok = await requestConfirm(confirmOpts);
    if (!ok) return;
  }
  action();
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  confirm,
  onClick,
  ...props
}: CommonProps & ComponentProps<"button">) {
  const { confirm: requestConfirm } = useConfirm();

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      onClick={(e) => {
        runWithConfirm(confirm, requestConfirm, () => onClick?.(e), e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  confirm,
  onClick,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  const router = useRouter();
  const { confirm: requestConfirm } = useConfirm();

  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      onClick={(e) => {
        if (!confirm) {
          onClick?.(e);
          return;
        }
        runWithConfirm(
          confirm,
          requestConfirm,
          () => {
            onClick?.(e);
            router.push(href.toString());
          },
          e,
        );
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
