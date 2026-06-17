"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input"> & {
  label: string;
  icon?: ReactNode;
  error?: string;
};

export function Input({
  label,
  icon,
  className,
  type = "text",
  error,
  id: externalId,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (show ? "text" : "password") : type;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block font-display text-xs font-semibold uppercase tracking-wider text-muted"
      >
        {label}
      </label>
      <div className="group relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            "h-12 w-full rounded-xl border bg-[color-mix(in_srgb,var(--background-soft)_70%,transparent)] px-4 text-sm text-foreground placeholder:text-muted/60 transition-all duration-200 outline-none",
            "focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
            error
              ? "border-rose-500/60 focus:border-rose-500"
              : "border-border focus:border-primary",
            icon && "pl-11",
            isPassword && "pr-11",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
          >
            {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
