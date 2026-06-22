"use client";

import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<"textarea"> & {
  label: string;
  error?: string;
};

export function Textarea({
  label,
  className,
  error,
  id: externalId,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block font-display text-xs font-semibold uppercase tracking-wider text-muted"
      >
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          "min-h-[100px] w-full resize-y rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted/60 transition-all duration-200 outline-none",
          "focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
          error
            ? "border-rose-500/60 focus:border-rose-500"
            : "border-border focus:border-primary",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
