"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import {
  useConfirm,
  type ConfirmOptions,
} from "@/components/providers/confirm-provider";
import { isSteamConnectHref, openSteamConnectUrl } from "@/lib/servers/connect";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "glass";
type Size = "sm" | "md" | "lg";

type LinkHref = ComponentProps<typeof Link>["href"];

function hrefToString(href: LinkHref): string {
  if (typeof href === "string") return href;
  if (typeof href === "object" && href !== null) {
    const path = href.pathname ?? "";
    const query = href.search ?? "";
    const hash = href.hash ?? "";
    return `${path}${query}${hash}`;
  }
  return String(href);
}

function isAppInternalHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#");
}

function navigateToHref(href: string, router: ReturnType<typeof useRouter>) {
  if (isSteamConnectHref(href)) {
    openSteamConnectUrl(href);
    return;
  }
  if (isAppInternalHref(href)) {
    router.push(href);
    return;
  }
  window.location.assign(href);
}

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
  disabled,
  ...props
}: CommonProps & ComponentProps<"button">) {
  const { confirm: requestConfirm } = useConfirm();

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled === true}
      onClick={(e) => {
        e.stopPropagation();
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
  const hrefString = hrefToString(href);
  const classNames = cn(base, variants[variant], sizes[size], className);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!confirm) {
      onClick?.(e);
      return;
    }
    runWithConfirm(
      confirm,
      requestConfirm,
      () => {
        onClick?.(e);
        navigateToHref(hrefString, router);
      },
      e,
    );
  };

  if (!isAppInternalHref(hrefString)) {
    return (
      <a href={hrefString} className={classNames} onClick={handleClick} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classNames} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
